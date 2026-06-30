import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const address = "0xC0288FFC38e7Dd4C576e2CDde7314Ba83F9b8411";
const client = createClient({ chain: testnetBradbury });
const deploymentHash = "0xd400d8f721bb966c84bbb98b7b57e5bbb40b68ee16a31920bfd1b52bde3958c0";

const [schema, code] = await Promise.all([
  client.getContractSchema(address),
  client.getContractCode(address),
]);

console.log(JSON.stringify({ address, schema }, null, 2));
console.log("\n--- CONTRACT CODE ---\n");
console.log(code);

try {
  const transaction = await client.getTransaction({ hash: deploymentHash });
  console.log("\n--- TRANSACTION ---\n");
  console.log(JSON.stringify(transaction, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
} catch (error) {
  console.error("\nTransaction lookup failed:", error instanceof Error ? error.message : error);
}

for (const [functionName, args] of [["get_task", ["landing-page-v1"]]]) {
  try {
    const value = await client.readContract({ address, functionName, args });
    console.log(`\n${functionName}:`, value);
  } catch (error) {
    console.error(`\n${functionName} failed:`, error instanceof Error ? error.message : error);
  }
}
