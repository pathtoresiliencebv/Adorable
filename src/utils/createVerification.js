import { FreestyleSandboxes } from "freestyle-sandboxes";

const api = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_API_KEY!
});

const request = await api.createDomainVerificationRequest("yourdomain.com");
console.log("Add this DNS record:");
console.log("Type: TXT");
console.log("Name: _freestyle_custom_hostname.yourdomain.com");
console.log("Value:", request.verificationCode);