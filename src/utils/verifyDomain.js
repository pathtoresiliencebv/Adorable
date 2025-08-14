const result = await api.verifyDomain("qreatify.dev");

if (result.domain) {
  console.log("Domain verified successfully!", result.domain);
} else {
  console.log("Verification failed:", result.message);
}