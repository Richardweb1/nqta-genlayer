# Nqta

Nqta checks a public proof URL against a task brief and records a neutral AI-validator verdict on GenLayer.

## GenLayer deployment

- Network: Bradbury Testnet (chain ID `4221`)
- RPC: `https://rpc-bradbury.genlayer.com`
- Contract: [`0xC0288FFC38e7Dd4C576e2CDde7314Ba83F9b8411`](https://explorer-bradbury.genlayer.com/address/0xC0288FFC38e7Dd4C576e2CDde7314Ba83F9b8411)
- Deployment transaction: [`0xd400d8f721bb966c84bbb98b7b57e5bbb40b68ee16a31920bfd1b52bde3958c0`](https://explorer-bradbury.genlayer.com/tx/0xd400d8f721bb966c84bbb98b7b57e5bbb40b68ee16a31920bfd1b52bde3958c0)
- Deployment status: `FINALIZED`
- Demo task transaction: [`0xba47e22167f3007f43b3591976104c2af15c0965b89e03c5d7b3bc1b2b23841e`](https://explorer-bradbury.genlayer.com/tx/0xba47e22167f3007f43b3591976104c2af15c0965b89e03c5d7b3bc1b2b23841e)
- Demo task status: `FINALIZED · AGREE · FINISHED_WITH_RETURN` (`result_code = 0`, empty stderr)

The deployed contract source is preserved in [`contracts/nqta.py`](contracts/nqta.py). The constructor takes no arguments.

## How it works

1. A task owner publishes a short task brief with `create_task`.
2. A submitter calls `verify` with a unique submission ID and a public proof URL.
3. The leader renders the public page and asks an LLM for a bounded JSON verdict, score, and short reason.
4. Validators independently fetch and judge the same page. Consensus compares the accepted flag and allows at most a one-point score difference.
5. Only after `run_nondet_unsafe` reaches consensus does the contract store the verdict, integer score, reason, submitter, and reputation update.

There is no manual or simulated validator loop. Public view methods are `get_task`, `get_verdict`, `get_score`, `get_reason`, and `get_reputation`.

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm run build
```

## Verification status

The deployment, demo task, and real [`verify` transaction](https://explorer-bradbury.genlayer.com/tx/0x3685ec73469220a4556ad3c106a4d17ab543fb1cc9f153ffa581569b4b255171) are finalized. Bradbury RPC confirms `FINALIZED · AGREE · FINISHED_WITH_RETURN`, `result_code = 0`, empty stderr, and an on-chain `ACCEPTED` verdict scoring `9/10` for submission `nqta-4315ef96-1782826845923`.
