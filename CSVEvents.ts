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

// Define the schema for rows in the sync table
const RowSchema = coda.makeObjectSchema({
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
  name: "CSVEvents",
  description: "Syncs event signup data from a CSV file hosted at a URL.",
  identityName: "EventSignup",
  schema: RowSchema,
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
