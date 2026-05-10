// Cloudflare Pages Function — POST /api/contact
// Sends form submissions via Resend API to case@timbrcase.com

interface Env {
  RESEND_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const data = await request.json<Record<string, string>>();

    // Honeypot — if filled, silently succeed (bots only)
    if (data.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const name = (data.name || '').toString().slice(0, 200);
    const email = (data.email || '').toString().slice(0, 200);
    const format = (data.format || '').toString().slice(0, 200);
    const finish = (data.finish || 'n/a').toString().slice(0, 200);
    const notes = (data.notes || '').toString().slice(0, 4000);

    if (!name || !email || !format) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), { status: 400 });
    }

    const text = [
      `Name:   ${name}`,
      `Email:  ${email}`,
      `Case:   ${format}`,
      `Finish: ${finish}`,
      ``,
      `Message:`,
      notes || '(none)',
    ].join('\n');

    const html = `
      <h2 style="font-family:system-ui;margin:0 0 16px">New Timbrcase reservation</h2>
      <table style="font-family:system-ui;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Case</td><td>${escapeHtml(format)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Finish</td><td>${escapeHtml(finish)}</td></tr>
      </table>
      <h3 style="font-family:system-ui;margin:20px 0 8px">Message</h3>
      <pre style="font-family:system-ui;white-space:pre-wrap;font-size:14px;background:#f7f2ea;padding:12px;border-radius:8px">${escapeHtml(notes || '(none)')}</pre>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Timbrcase <noreply@timbrcase.com>',
        to: ['case@timbrcase.com'],
        reply_to: email,
        subject: `New reservation — ${format} — ${name}`,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
