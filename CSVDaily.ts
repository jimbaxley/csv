import * as coda from "@codahq/packs-sdk";

export const pack = coda.newPack();

function parseCSV(csv: string): Array<{ [key: string]: string }> {
  // Split by newlines and filter empty lines
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const [headerLine, ...dataLines] = lines;
  
  // Parse a CSV line, handling quoted fields
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };
  
  const headers = parseLine(headerLine);
  
  return dataLines.map(line => {
    const values = parseLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || "";
      return acc;
    }, {} as { [key: string]: string });
  });
}

// Allow network requests to any domain (adjust for security if needed)
pack.addNetworkDomain("securevan.com");

// Define the schema for donation rows
const DonationSchema = coda.makeObjectSchema({
  properties: {
    contributionId: { 
      type: coda.ValueType.String, 
      description: "Contribution ID"
    },
    contactName: { 
      type: coda.ValueType.String, 
      description: "Contact Name"
    },
    dateReceived: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.Date,
      description: "Date Received"
    },
    amount: { 
      type: coda.ValueType.String, 
      description: "Amount"
    },
    sourceCode: { 
      type: coda.ValueType.String, 
      description: "Source Code"
    },
    directMarketingCode: {
      type: coda.ValueType.String,
      description: "Direct Marketing Code"
    },
      onlineReferenceNumber: {
        type: coda.ValueType.String,
        description: "Online Reference Number"
      },
    isRecurringCommitment: { 
      type: coda.ValueType.Boolean, 
      description: "Is Recurring Commitment"
    },
    preferredEmail: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.Email,
      description: "Preferred Email"
    },
    homeStreetAddress: { 
      type: coda.ValueType.String, 
      description: "Home Street Address"
    },
    mailingCity: { 
      type: coda.ValueType.String, 
      description: "Mailing City"
    },
    mailingState: { 
      type: coda.ValueType.String, 
      description: "Mailing State"
    },
    homeZipPostal: { 
      type: coda.ValueType.String, 
      description: "Home Zip/Postal"
    },
    marketSource: { 
      type: coda.ValueType.String, 
      description: "Market Source"
    },
    onlineFormCampaign: { 
      type: coda.ValueType.String, 
      description: "Online Form Campaign"
    },
    vanId: { 
      type: coda.ValueType.String, 
      description: "VANID"
    },
    installmentNumber: { 
      type: coda.ValueType.Number, 
      description: "Installment Number"
    },
  },
  displayProperty: "contactName",
  idProperty: "contributionId",
  featuredProperties: ["contactName", "amount", "dateReceived"]
});

// Define the schema for event signup rows
const EventSchema = coda.makeObjectSchema({
  properties: {
    eventSignupId: {
      type: coda.ValueType.String,
      description: "Unique Event Signup ID"
    },
    eventId: { 
      type: coda.ValueType.String, 
      description: "Event ID"
    },
    vanId: { 
      type: coda.ValueType.String, 
      description: "VANID"
    },
    contactName: { 
      type: coda.ValueType.String, 
      description: "Contact Name"
    },
    signupDate: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.Date,
      description: "Signup Date"
    },
    status: { 
      type: coda.ValueType.String, 
      description: "Status"
    },
    role: { 
      type: coda.ValueType.String, 
      description: "Role"
    },
    eventName: { 
      type: coda.ValueType.String, 
      description: "Event Name"
    },
    eventType: { 
      type: coda.ValueType.String, 
      description: "Event Type"
    },
    eventDate: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.Date,
      description: "Event Date"
    },
    shiftStartTime: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.DateTime,
      description: "Shift Start Time"
    },
    shiftEndTime: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.DateTime,
      description: "Shift End Time"
    },
    locationName: { 
      type: coda.ValueType.String, 
      description: "Location Name"
    },
    preferredEmail: { 
      type: coda.ValueType.String, 
      codaType: coda.ValueHintType.Email,
      description: "Preferred Email"
    },
    preferredPhoneNumber: { 
      type: coda.ValueType.String, 
      description: "Preferred Phone Number"
    },
  },
  displayProperty: "contactName",
  idProperty: "eventSignupId",
  featuredProperties: ["contactName", "eventName", "eventDate", "status"]
});

// Add a sync table to fetch and parse CSV data
pack.addSyncTable({
  name: "CSVDaily",
  description: "Syncs daily donation data from a CSV file hosted at a URL.",
  identityName: "DailyDonation",
  schema: DonationSchema,
  formula: {
    name: "FetchDailyCSV",
    description: "Fetches and parses daily donation CSV data from a provided URL.",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: "url",
        description: "The URL of the CSV file.",
      }),
    ],
    execute: async ([url], context) => {
      // Fetch the CSV file
      const response = await context.fetcher.fetch({
        method: "GET",
        url,
      });

      // Parse the CSV data
      const csvData = response.body;
      const records = parseCSV(csvData);

      // Map parsed records to match the schema
      const result = records.map((record, index) => ({
        contributionId: record["Contribution ID"] || `row-${index}`,
        contactName: record["Contact Name"] || "",
        dateReceived: record["Date Received"] || "",
        amount: record["Amount"] || "",
        sourceCode: record["Source Code"] || "",
        directMarketingCode: record["Direct Marketing Code"] || "",
        onlineReferenceNumber: record["Online Reference Number"] || "",
        isRecurringCommitment: record["Is Recurring Commitment"] === "1" || record["Is Recurring Commitment"]?.toLowerCase() === "yes",
        preferredEmail: record["Preferred Email"] || "",
        homeStreetAddress: record["Home Street Address"] || "",
        mailingCity: record["Mailing City"] || "",
        mailingState: record["Mailing State"] || "",
        homeZipPostal: record["Home Zip/Postal"] || "",
        marketSource: record["Market Source"] || "",
        onlineFormCampaign: record["Online Form Campaign"] || "",
        vanId: record["VANID"] || "",
        installmentNumber: record["Installment Number"] ? parseInt(record["Installment Number"]) : undefined,
      }));
      
      return { result };
    },
  },
});

// Add a second sync table for event signups
pack.addSyncTable({
  name: "CSVEvents",
  description: "Syncs event signup data from a CSV file hosted at a URL.",
  identityName: "EventSignup",
  schema: EventSchema,
  formula: {
    name: "FetchEventsCSV",
    description: "Fetches and parses event signup CSV data from a provided URL.",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: "url",
        description: "The URL of the CSV file.",
      }),
    ],
    execute: async ([url], context) => {
      // Fetch the CSV file
      const response = await context.fetcher.fetch({
        method: "GET",
        url,
      });

      // Parse the CSV data
      const csvData = response.body;
      const records = parseCSV(csvData);

      // Map parsed records to match the schema
      const result = records.map((record, index) => ({
        eventSignupId: `${record["Event ID"] || ""}::${record["VANID"] || ""}::${record["Shift Start Time"] || ""}::${record["Role"] || ""}::${index}`,
        eventId: record["Event ID"] || "",
        vanId: record["VANID"] || `row-${index}`,
        contactName: record["Contact Name"] || "",
        signupDate: record["Signup Date"] || "",
        status: record["Status"] || "",
        role: record["Role"] || "",
        eventName: record["Event Name"] || "",
        eventType: record["Event Type"] || "",
        eventDate: record["Event Date"] || "",
        shiftStartTime: record["Shift Start Time"] || "",
        shiftEndTime: record["Shift End Time"] || "",
        locationName: record["Location Name"] || "",
        preferredEmail: record["Preferred Email"] || "",
        preferredPhoneNumber: record["Preferred Phone Number"] || "",
      }));
      
      return { result };
    },
  },
});
