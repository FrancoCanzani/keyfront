type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_EMAIL_API_TOKEN;
const fromAddress = process.env.EMAIL_FROM;

// Cloudflare Email Sending via REST API (we run on Bun, not Workers).
// Without credentials (dev) the email is printed to the console instead.
export async function sendEmail(input: SendEmailInput) {
  if (!accountId || !apiToken || !fromAddress) {
    console.log(`[email] to=${input.to} subject=${input.subject}`);
    console.log(input.text);
    return;
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        from: { address: fromAddress, name: "Keyfront" },
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    },
  );

  const body = (await res.json()) as { success: boolean; errors?: unknown[] };
  if (!res.ok || !body.success) {
    throw new Error(
      `email send failed (${res.status}): ${JSON.stringify(body.errors)}`,
    );
  }
}
