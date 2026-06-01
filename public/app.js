const POLL_INTERVAL_MS = 10000;

const state = {
  providers: [],
  recommendation: { recommended: null, fallback: null },
  isLoading: false,
  timer: null
};

const elements = {
  grid: document.querySelector("#providers-grid"),
  refreshButton: document.querySelector("#refresh-button"),
  lastUpdated: document.querySelector("#last-updated"),
  liveStatus: document.querySelector("#live-status"),
  totalProviders: document.querySelector("#total-providers"),
  activeModels: document.querySelector("#active-models"),
  criticalAlerts: document.querySelector("#critical-alerts"),
  nextReset: document.querySelector("#next-reset"),
  recommendedModel: document.querySelector("#recommended-model"),
  recommendedMeta: document.querySelector("#recommended-meta"),
  fallbackModel: document.querySelector("#fallback-model"),
  fallbackMeta: document.querySelector("#fallback-meta"),
  errorToast: document.querySelector("#error-toast")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return String(value ?? "Unknown")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getQuotaPercent(model) {
  const quota = model?.quota ?? model;
  const total = Number(quota?.total ?? 0);
  const remaining = Number(quota?.remaining ?? 0);

  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return clamp(Math.round((remaining / total) * 100), 0, 100);
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(number);
}

function formatFriendlyDuration(dateLike) {
  if (!dateLike) {
    return "No reset scheduled";
  }

  const resetDate = new Date(dateLike);

  if (Number.isNaN(resetDate.getTime())) {
    return "Reset time unavailable";
  }

  const diff = resetDate.getTime() - Date.now();

  if (diff <= 0) {
    return "Reset due now";
  }

  const minutes = Math.ceil(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0 && days === 0) {
    parts.push(`${mins}m`);
  }

  return parts.slice(0, 2).join(" ") || "Under 1m";
}

function normalizeProviderEntry(name, value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      provider: value.provider ?? name,
      status: value.status ?? "active",
      health: value.health ?? "OK",
      models: Array.isArray(value.models) ? value.models : [],
      resetAt: value.resetAt ?? null,
      lastUpdatedAt: value.lastUpdatedAt ?? null
    };
  }

  return {
    provider: name,
    status: "active",
    health: value ?? "OK",
    models: [],
    resetAt: null,
    lastUpdatedAt: null
  };
}

function normalizeProviders(payload) {
  if (Array.isArray(payload)) {
    return payload.map((provider) => normalizeProviderEntry(provider.provider, provider));
  }

  if (payload?.providers && Array.isArray(payload.providers)) {
    return payload.providers.map((provider) => normalizeProviderEntry(provider.provider, provider));
  }

  if (payload && typeof payload === "object") {
    return Object.entries(payload).map(([name, value]) => normalizeProviderEntry(name, value));
  }

  return [];
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function loadProviderDetails(providers) {
  const needsDetails = providers.filter((provider) => provider.models.length === 0);

  if (needsDetails.length === 0) {
    return providers;
  }

  const details = await Promise.all(
    providers.map(async (provider) => {
      if (provider.models.length > 0) {
        return provider;
      }

      try {
        const detail = await fetchJson(`/v1/providers/${encodeURIComponent(provider.provider)}`);
        return normalizeProviderEntry(provider.provider, {
          ...provider,
          ...detail,
          health: detail.health ?? provider.health
        });
      } catch {
        return provider;
      }
    })
  );

  return details;
}

function renderStats() {
  const providers = state.providers;
  const criticalCount = providers.filter((provider) => ["CRITICAL", "BLOCKED"].includes(provider.health)).length;
  const activeModels = providers.reduce((total, provider) => total + (provider.models?.length ?? 0), 0);
  const resetDates = providers
    .flatMap((provider) => [provider.resetAt, ...(provider.models ?? []).map((model) => model.resetAt)])
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime());

  elements.totalProviders.textContent = String(providers.length);
  elements.activeModels.textContent = String(activeModels);
  elements.criticalAlerts.textContent = String(criticalCount);
  elements.nextReset.textContent = resetDates[0] ? formatFriendlyDuration(resetDates[0]) : "No reset";
}

function renderRecommendations() {
  const recommended = state.recommendation.recommended;
  const fallback = state.recommendation.fallback;

  renderRecommendationSlot(recommended, elements.recommendedModel, elements.recommendedMeta, "No model available");
  renderRecommendationSlot(fallback, elements.fallbackModel, elements.fallbackMeta, "No fallback available");
}

function renderRecommendationSlot(model, titleElement, metaElement, emptyText) {
  if (!model) {
    titleElement.textContent = emptyText;
    metaElement.textContent = "No healthy candidates returned";
    return;
  }

  const percent = getQuotaPercent(model);
  const type = model.type ?? model.quota?.type ?? "quota";

  titleElement.textContent = model.modelName ?? model.modelId ?? "Unnamed model";
  metaElement.textContent = `${titleCase(model.provider)} · ${percent}% remaining · ${formatNumber(model.remaining ?? model.quota?.remaining)} ${type}`;
}

function renderProviders() {
  if (state.providers.length === 0) {
    elements.grid.innerHTML = `
      <article class="provider-card">
        <div class="error-state">No providers returned by the API.</div>
      </article>
    `;
    return;
  }

  elements.grid.innerHTML = state.providers.map(renderProviderCard).join("");
}

function renderProviderCard(provider) {
  const health = String(provider.health ?? "BLOCKED").toUpperCase();
  const models = Array.isArray(provider.models) ? provider.models : [];
  const modelMarkup = models.length > 0
    ? models.map(renderModel).join("")
    : '<div class="empty-models">No model quota details available for this provider.</div>';

  return `
    <article class="provider-card">
      <div class="provider-title">
        <div class="provider-name">
          <h3>${escapeHtml(titleCase(provider.provider))}</h3>
          <span>${escapeHtml(titleCase(provider.status ?? "unknown"))} · ${models.length} model${models.length === 1 ? "" : "s"}</span>
        </div>
        <span class="health-badge health-${escapeHtml(health.toLowerCase())}">${escapeHtml(health)}</span>
      </div>
      <div class="models-list">
        ${modelMarkup}
      </div>
    </article>
  `;
}

function renderModel(model) {
  const percent = getQuotaPercent(model);
  const quota = model.quota ?? {};
  const used = formatNumber(quota.used ?? 0);
  const total = formatNumber(quota.total ?? 0);
  const type = quota.type ?? "quota";

  return `
    <div class="model">
      <div class="model-row">
        <strong>${escapeHtml(model.modelName ?? model.modelId ?? "Unnamed model")}</strong>
        <span class="percent">${percent}%</span>
      </div>
      <div class="progress-track" aria-label="${escapeHtml(percent)} percent remaining">
        <div class="progress-fill" style="--progress: ${percent}%"></div>
      </div>
      <div class="model-meta">
        <span>${escapeHtml(formatFriendlyDuration(model.resetAt))}</span>
        <span>${escapeHtml(used)} / ${escapeHtml(total)} ${escapeHtml(type)}</span>
      </div>
    </div>
  `;
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  elements.refreshButton.classList.toggle("is-loading", isLoading);
  elements.refreshButton.disabled = isLoading;
}

function setConnectionState(isConnected) {
  elements.liveStatus.textContent = isConnected ? "Live" : "Connection Issue";
  document.body.classList.toggle("has-error", !isConnected);
}

function showError(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.classList.add("show");
  window.clearTimeout(showError.timeout);
  showError.timeout = window.setTimeout(() => {
    elements.errorToast.classList.remove("show");
  }, 4200);
}

async function refreshDashboard() {
  if (state.isLoading) {
    return;
  }

  setLoading(true);

  try {
    const [providersPayload, recommendation] = await Promise.all([
      fetchJson("/v1/providers"),
      fetchJson("/v1/models/best-match")
    ]);

    const providers = await loadProviderDetails(normalizeProviders(providersPayload));
    state.providers = providers.sort((a, b) => String(a.provider).localeCompare(String(b.provider)));
    state.recommendation = recommendation ?? { recommended: null, fallback: null };

    renderStats();
    renderRecommendations();
    renderProviders();

    elements.lastUpdated.textContent = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
    setConnectionState(true);
  } catch (error) {
    setConnectionState(false);
    showError(error.message || "Unable to refresh dashboard data.");

    if (state.providers.length === 0) {
      elements.grid.innerHTML = `
        <article class="provider-card">
          <div class="error-state">Unable to connect to the API. Waiting for the next refresh.</div>
        </article>
      `;
    }
  } finally {
    setLoading(false);
  }
}

elements.refreshButton.addEventListener("click", refreshDashboard);

refreshDashboard();
state.timer = window.setInterval(refreshDashboard, POLL_INTERVAL_MS);
