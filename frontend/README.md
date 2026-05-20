# DC.news Mantle — Frontend

Next.js 15 app, viem + wagmi for on-chain reads + writes. Deploys to Vercel.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## After contracts deploy

Edit `app/lib/contracts.ts` and paste the deployed addresses from `/deployments/<network>.json` into `SIGNAL_REGISTRY` and `AGENT_IDENTITY` maps.

## Deploy to Vercel

```bash
npx vercel --prod
```

(Or push to GitHub and connect the repo to Vercel for auto-deploy.)
