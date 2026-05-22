import * as coda from "@codahq/packs-sdk";
//import { parse } from "csv-parse/sync"; // Install with `npm install csv-parse`

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
pack.addNetworkDomain("securevan.com"); // Replace "*" with specific domains for security

// Define the schema for rows in the sync table
const RowSchema = coda.makeObjectSchema({
  properties: {
    contributionId: { 
      type: coda.ValueType.String, 
      description: "Contribution ID"
    },
    vanId: { 
      type: coda.ValueType.String, 
      description: "VANID"
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
      type: coda.ValueType.Number, 
      codaType: coda.ValueHintType.Currency,
      description: "Amount"
    },
    sourceCode: { 
      type: coda.ValueType.String, 
      description: "Source Code"
    },
    paymentMethod: { 
      type: coda.ValueType.String, 
      description: "Payment Method"
    },
    marketSource: { 
      type: coda.ValueType.String, 
      description: "Market Source"
    },
  },
  displayProperty: "contactName",
  idProperty: "contributionId",
  featuredProperties: ["contactName", "amount", "dateReceived"]
});

// Add a sync table to fetch and parse CSV data
pack.addSyncTable({
  name: "CSVData",
  description: "Syncs data from a CSV file hosted at a URL.",
  identityName: "CSVRow",
  schema: RowSchema,
  formula: {
    name: "FetchCSV",
    description: "Fetches and parses CSV data from a provided URL.",
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
      console.log("Raw CSV data:", csvData);
      
      const records = parseCSV(csvData);
      console.log("Parsed records count:", records.length);
      console.log("First record:", records[0]);
      console.log("First record keys:", records[0] ? Object.keys(records[0]) : "no records");

      // Map parsed records to match the schema
      const result = records.map((record, index) => {
        const mapped = {
          contributionId: record["Contribution ID"] || `row-${index}`,
          vanId: record["VANID"] || "",
          contactName: record["Contact Name"] || "",
          dateReceived: record["Date Received"] || "",
          amount: parseFloat(record["Amount"]) || 0,
          sourceCode: record["Source Code"] || "",
          paymentMethod: record["Payment Method"] || "",
          marketSource: record["Market Source"] || "",
        };
        console.log(`Record ${index} - Contribution ID: "${record["Contribution ID"]}" -> mapped ID: "${mapped.contributionId}"`);
        return mapped;
      });
      
      console.log("Final result count:", result.length);
      return { result };
    },
  },
});
