import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const hash = process.argv[2];
const submissionId = process.argv[3];
if (!/^0x[0-9a-fA-F]{64}$/.test(hash || "")) throw new Error("Pass a valid transaction hash");

const address = "0xC0288FFC38e7Dd4C576e2CDde7314Ba83F9b8411";
const client = createClient({ chain: testnetBradbury });
const stringify = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);

const tx = await client.getTransaction({ hash });
console.log("TRANSACTION");
console.log(stringify({
  txId: tx.txId,
  recipient: tx.recipient,
  sender: tx.sender,
  statusName: tx.statusName,
  resultName: tx.resultName,
  txExecutionResultName: tx.txExecutionResultName,
  txDataDecoded: tx.txDataDecoded,
}));

try {
  const trace = await client.debugTraceTransaction({ hash });
  console.log("TRACE");
  console.log(stringify({
    result_code: trace.result_code,
    return_data: trace.return_data,
    stderr: trace.stderr,
  }));
} catch (error) {
  console.log("TRACE_UNAVAILABLE", error instanceof Error ? error.message.split("\n")[0] : String(error));
}

const task = await client.readContract({ address, functionName: "get_task", args: ["one-page-product-site"] });
console.log("TASK", stringify(task));

if (submissionId) {
  const [verdict, score, reason] = await Promise.all([
    client.readContract({ address, functionName: "get_verdict", args: [submissionId] }),
    client.readContract({ address, functionName: "get_score", args: [submissionId] }),
    client.readContract({ address, functionName: "get_reason", args: [submissionId] }),
  ]);
  console.log("VERIFICATION", stringify({ submissionId, verdict, score, reason }));
}
