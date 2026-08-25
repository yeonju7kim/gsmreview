const config = window.GSM_CONFIG ?? {};

const messageLabels = {
  surrender: "하나님께 나를 드리는 삶",
  love: "평범한 일상을 큰 사랑으로 사는 삶",
  thought: "성령의 생각을 따라 기쁨을 누리는 삶",
  church: "예수님을 닮아 새사람이 되는 삶",
  relationship: "관계 속에서 사랑을 구체적으로 살아내는 삶",
};

const progressSteps = {
  reflection: { count: "1 / 3", label: "01 · 기억", width: "33.333%" },
  action: { count: "2 / 3", label: "02 · 실천", width: "66.666%" },
  review: { count: "3 / 3", label: "03 · 다짐", width: "100%" },
};

const form = document.querySelector("#reflection-form");
const screens = [...document.querySelectorAll("[data-screen]")];
const formProgress = document.querySelector("[data-form-progress]");
const progressLabel = document.querySelector("[data-progress-label]");
const progressCount = document.querySelector("[data-progress-count]");
const progressBar = document.querySelector("[data-progress-bar]");
const previewNotice = document.querySelector("[data-preview-notice]");
const submitButton = document.querySelector(".button-submit");
const submitLabel = document.querySelector("[data-submit-label]");
const submitError = document.querySelector("[data-submit-error]");
const toast = document.querySelector("[data-toast]");
let toastTimer;

function showScreen(name) {
  screens.forEach((screen) => {
    const isTarget = screen.dataset.screen === name;
    screen.classList.toggle("is-active", isTarget);
    screen.setAttribute("aria-hidden", String(!isTarget));
  });

  const progress = progressSteps[name];
  formProgress.hidden = !progress;
  if (progress) {
    progressLabel.textContent = progress.label;
    progressCount.textContent = progress.count;
    progressBar.style.width = progress.width;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function buildSubmissionBody(payload) {
  if (config.provider !== "formsubmit") return payload;

  return {
    _subject: `[GSM 회고] ${payload.name}님의 한 달 다짐`,
    _template: "table",
    _honey: payload.website,
    _url: window.location.href,
    작성자: payload.name,
    "기억에 남은 메시지": payload.messages.join(" / "),
    "마음에 남은 이유와 느낀 점": payload.reflection,
    "한 달 액션 포인트": payload.actionPoint,
    ...(payload.prayerRequest ? { "함께 기도받고 싶은 제목": payload.prayerRequest } : {}),
    ...(payload.respondentEmail
      ? { email: payload.respondentEmail, _cc: payload.respondentEmail }
      : {}),
    "제출 시각": new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(payload.submittedAt)),
  };
}

function isSuccessfulSubmission(response, result) {
  if (!response.ok) return false;
  if (config.provider === "formsubmit") {
    return result.success === true || result.success === "true";
  }
  return result.ok === true;
}

function isActivationPending(result) {
  return (
    config.provider === "formsubmit" &&
    result.success === "false" &&
    typeof result.message === "string" &&
    result.message.toLowerCase().includes("needs activation")
  );
}

function valueOf(name) {
  return form.elements[name]?.value.trim() ?? "";
}

function setError(name, message = "") {
  const error = document.querySelector(`[data-error="${name}"]`);
  if (error) error.textContent = message;
}

function validateReflection() {
  const messages = selectedMessages();
  const reflection = valueOf("reflection");
  let valid = true;

  setError("message");
  setError("reflection");

  if (!messages.length) {
    setError("message", "가장 기억에 남는 메시지를 하나 이상 골라주세요.");
    valid = false;
  }
  if (!reflection) {
    setError("reflection", "마음에 남은 이유나 느낀 점을 적어주세요.");
    valid = false;
  }

  if (!valid) {
    document.querySelector('[data-error]:not(:empty)')?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
  return valid;
}

function validateAction() {
  const actionPoint = valueOf("actionPoint");
  setError("actionPoint");
  if (!actionPoint) {
    setError("actionPoint", "앞으로 한 달 동안 지킬 한 가지를 적어주세요.");
    return false;
  }
  return true;
}

function validateOptionalEmail() {
  const emailField = form.elements.respondentEmail;
  setError("respondentEmail");
  if (emailField.value.trim() && !emailField.validity.valid) {
    setError("respondentEmail", "이메일 주소를 올바른 형식으로 적어주세요.");
    emailField.focus();
    return false;
  }
  return true;
}

function selectedMessages() {
  return [...form.querySelectorAll('input[name="message"]:checked')].map((input) => input.value);
}

function fullActionSentence() {
  const action = valueOf("actionPoint");
  if (!action) return "";
  const ending = /[.!?。！？]$/u.test(action) ? "" : ".";
  return `나는 앞으로 한 달 동안, ${action}${ending}`;
}

function renderReview() {
  const messages = selectedMessages().map((messageId) => messageLabels[messageId]);
  document.querySelector("[data-review-message]").textContent = messages.join(" · ");
  document.querySelector("[data-review-action]").textContent = fullActionSentence();
  document.querySelector("[data-success-action]").textContent = fullActionSentence();
  document.querySelector("[data-review-date]").textContent = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

document.querySelector('[data-next="action"]').addEventListener("click", () => {
  if (validateReflection()) showScreen("action");
});

document.querySelector('[data-next="review"]').addEventListener("click", () => {
  if (!validateAction()) return;
  renderReview();
  showScreen("review");
});

document.querySelectorAll("textarea[maxlength]").forEach((textarea) => {
  const counter = document.querySelector(`[data-count="${textarea.name}"]`);
  const updateCount = () => {
    if (counter) counter.textContent = String(textarea.value.length);
  };
  textarea.addEventListener("input", updateCount);
  updateCount();
});

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const actionField = form.elements.actionPoint;
    actionField.value = button.dataset.example;
    actionField.dispatchEvent(new Event("input"));
    actionField.focus();
    setError("actionPoint");
  });
});

previewNotice.hidden = Boolean(config.submissionEndpoint);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitError.textContent = "";

  if (!validateReflection() || !validateAction()) {
    showScreen(!validateReflection() ? "reflection" : "action");
    return;
  }
  if (!validateOptionalEmail()) return;

  const payload = {
    name: valueOf("name") || "익명",
    messageIds: selectedMessages(),
    messages: selectedMessages().map((messageId) => messageLabels[messageId]),
    reflection: valueOf("reflection"),
    actionPoint: fullActionSentence(),
    prayerRequest: valueOf("prayerRequest"),
    respondentEmail: valueOf("respondentEmail"),
    website: valueOf("website"),
    submittedAt: new Date().toISOString(),
  };

  submitButton.classList.add("is-loading");
  submitButton.disabled = true;
  submitLabel.textContent = "다짐을 남기는 중";

  try {
    if (config.submissionEndpoint) {
      const response = await fetch(config.submissionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(buildSubmissionBody(payload)),
      });
      const result = await response.json().catch(() => ({}));
      const activationPending = isActivationPending(result);
      if (!isSuccessfulSubmission(response, result) && !activationPending) {
        throw new Error("제출 요청이 정상 처리되지 않았습니다.");
      }

      if (result.preview) {
        const stored = JSON.parse(localStorage.getItem("gsm-preview-submissions") || "[]");
        localStorage.setItem(
          "gsm-preview-submissions",
          JSON.stringify([...stored.slice(-9), payload]),
        );
        document.querySelector("[data-success-copy]").innerHTML =
          "현재는 시안 확인 모드라 이메일은 전송되지 않았어요.<br />오늘 적은 다짐은 이 브라우저에만 임시 저장했어요.";
      } else {
        document.querySelector("[data-success-copy]").innerHTML = activationPending
          ? "작성한 내용이 안전하게 접수되었어요.<br />오늘의 작은 한 가지를 함께 응원할게요."
          : payload.respondentEmail
            ? "작성한 내용이 잘 전달되었어요.<br />입력한 이메일로도 다짐을 함께 보냈어요."
            : "작성한 내용이 잘 전달되었어요.<br />오늘의 작은 한 가지를 함께 응원할게요.";
      }
    } else {
      const stored = JSON.parse(localStorage.getItem("gsm-preview-submissions") || "[]");
      localStorage.setItem(
        "gsm-preview-submissions",
        JSON.stringify([...stored.slice(-9), payload]),
      );
      document.querySelector("[data-success-copy]").innerHTML =
        "현재는 시안 확인 모드라 이메일은 전송되지 않았어요.<br />오늘 적은 다짐은 이 브라우저에만 임시 저장했어요.";
    }

    document.querySelector("[data-success-action]").textContent = payload.actionPoint;
    showScreen("success");
  } catch (error) {
    submitError.textContent = "잠시 문제가 생겼어요. 내용을 그대로 둔 채 다시 시도해주세요.";
    showToast(error.message || "제출하지 못했습니다.");
  } finally {
    submitButton.classList.remove("is-loading");
    submitButton.disabled = false;
    submitLabel.textContent = "나의 다짐 남기기";
  }
});

document.querySelector("[data-restart]").addEventListener("click", () => {
  form.reset();
  document.querySelectorAll("[data-count]").forEach((counter) => {
    counter.textContent = "0";
  });
  document.querySelectorAll("[data-error]").forEach((error) => {
    error.textContent = "";
  });
  showScreen("summary");
});

showScreen("summary");
