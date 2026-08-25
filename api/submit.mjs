import { randomUUID } from "node:crypto";

const messageLabels = {
  surrender: "하나님께 나를 드리는 삶",
  love: "평범한 일상을 큰 사랑으로 사는 삶",
  thought: "성령의 생각을 따라 기쁨을 누리는 삶",
  church: "예수님을 닮아 새사람이 되는 삶",
  relationship: "관계 속에서 사랑을 구체적으로 살아내는 삶",
};

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 20_000) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return JSON.parse(raw || "{}");
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanEmail(value) {
  const email = cleanText(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSubmittedAt(value) {
  const parsed = new Date(value);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildEmail({ name, messages, reflection, actionPoint, prayerRequest, submittedAt }) {
  const safeName = escapeHtml(name);
  const safeReflection = escapeHtml(reflection).replaceAll("\n", "<br />");
  const safeAction = escapeHtml(actionPoint).replaceAll("\n", "<br />");
  const safePrayer = escapeHtml(prayerRequest).replaceAll("\n", "<br />");
  const safeMessages = messages.map(escapeHtml);
  const formattedDate = formatSubmittedAt(submittedAt);

  const text = [
    "새로운 GSM 회고가 도착했습니다.",
    "",
    `작성자: ${name}`,
    `제출 시각: ${formattedDate}`,
    "",
    "[가장 기억에 남은 메시지]",
    ...messages.map((message) => `- ${message}`),
    "",
    "[마음에 남은 이유와 느낀 점]",
    reflection,
    "",
    "[앞으로 한 달의 액션 포인트]",
    actionPoint,
    ...(prayerRequest ? ["", "[함께 기도받고 싶은 제목]", prayerRequest] : []),
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="ko">
      <body style="margin:0;padding:0;background:#f4f0e7;color:#17231e;font-family:Arial,'Noto Sans KR',sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
          <div style="padding:34px;background:#fffdf8;border:1px solid #ded8cd;border-radius:4px 28px 4px 4px;">
            <p style="margin:0 0 12px;color:#355c4b;font-size:11px;font-weight:700;letter-spacing:2px;">GSM · FROM MEMORY TO LIFE</p>
            <h1 style="margin:0 0 30px;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.3;">새로운 한 달의 다짐이<br />도착했어요.</h1>
            <div style="padding:14px 16px;background:#f4f0e7;border-radius:4px;font-size:13px;line-height:1.7;">
              <strong>${safeName}</strong><br />
              <span style="color:#68716c;">${formattedDate}</span>
            </div>

            <p style="margin:30px 0 10px;color:#68716c;font-size:11px;font-weight:700;">가장 기억에 남은 메시지</p>
            <ul style="margin:0;padding-left:20px;font-size:16px;line-height:1.8;">
              ${safeMessages.map((message) => `<li>${message}</li>`).join("")}
            </ul>

            <p style="margin:30px 0 10px;color:#68716c;font-size:11px;font-weight:700;">마음에 남은 이유와 느낀 점</p>
            <div style="font-size:15px;line-height:1.8;">${safeReflection}</div>

            <div style="height:1px;margin:30px 0;background:#ded8cd;"></div>
            <p style="margin:0 0 12px;color:#cf7457;font-size:11px;font-weight:700;">앞으로 한 달의 액션 포인트</p>
            <div style="padding:24px;color:#fffdf8;background:#234235;border-radius:4px 24px 4px 4px;font-family:Georgia,serif;font-size:21px;line-height:1.65;">${safeAction}</div>
            ${
              prayerRequest
                ? `<p style="margin:30px 0 10px;color:#68716c;font-size:11px;font-weight:700;">함께 기도받고 싶은 제목</p>
                   <div style="font-size:15px;line-height:1.8;">${safePrayer}</div>`
                : ""
            }
          </div>
        </div>
      </body>
    </html>
  `;

  return { html, text };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body = await readBody(request);

    // 화면에는 보이지 않는 필드입니다. 자동 입력 봇은 성공으로 응답하되 이메일을 보내지 않습니다.
    if (cleanText(body.website, 100)) {
      sendJson(response, 200, { ok: true });
      return;
    }

    const name = cleanText(body.name, 40) || "익명";
    const reflection = cleanText(body.reflection, 500);
    const actionPoint = cleanText(body.actionPoint, 300);
    const prayerRequest = cleanText(body.prayerRequest, 300);
    const respondentEmail = cleanEmail(body.respondentEmail);
    const messageIds = Array.isArray(body.messageIds)
      ? [...new Set(body.messageIds.filter((id) => Object.hasOwn(messageLabels, id)))].slice(0, 5)
      : [];
    const messages = messageIds.map((id) => messageLabels[id]);

    if (!messages.length || !reflection || !actionPoint) {
      sendJson(response, 400, { ok: false, error: "INVALID_SUBMISSION" });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.GSM_RECIPIENT_EMAIL;
    const from = process.env.GSM_FROM_EMAIL || "GSM 회고 <onboarding@resend.dev>";

    if (!apiKey || !recipient) {
      if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
        sendJson(response, 200, { ok: true, preview: true });
        return;
      }
      sendJson(response, 503, { ok: false, error: "EMAIL_NOT_CONFIGURED" });
      return;
    }

    const email = buildEmail({
      name,
      messages,
      reflection,
      actionPoint,
      prayerRequest,
      submittedAt: body.submittedAt,
    });
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
        "User-Agent": "gsm-review/1.0",
      },
      body: JSON.stringify({
        from,
        to: [recipient, ...(respondentEmail ? [respondentEmail] : [])],
        subject: `[GSM 회고] ${name}님의 한 달 다짐`,
        html: email.html,
        text: email.text,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      console.error("Email delivery failed", emailResponse.status, errorBody);
      sendJson(response, 502, { ok: false, error: "EMAIL_DELIVERY_FAILED" });
      return;
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Submission failed", error);
    const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, { ok: false, error: "INVALID_REQUEST" });
  }
}
