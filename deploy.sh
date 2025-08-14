npm run build

cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp package-lock.json .next/standalone/package-lock.json
cp .env.production .next/standalone/.env.production
cp .env .next/standalone/.env

cd .next/standalone
npx freestyle deploy --web server.js --domain qreatify.dev --timeout 360
import { FreestyleSandboxes } from "freestyle-sandboxes";

const api = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_API_KEY!, // make sure to set this
});

api
  .deployWeb(
    {
      kind: "git",
      url: "https://github.com/freestyle-sh/freestyle-base-nextjs-shadcn", // URL of the repository you want to deploy
    },
    {
      domains: ["qreatify.dev"],
      build: true, // automatically detects the framework and builds the code
    }
  )
  .then((result) => {
    console.log("Deployed website @ ", result.domains);
  });