// "Anty-legionella / Anti-legionella": a DHW disinfection cycle scheduled by the hub (package hub_legionella).
// The hub puts the DHW time program into Manual, writes the setpoint the boiler reads from the emulated panel and
// watches the cylinder (D03); at the end it returns the program to Auto and the boiler re-applies its own setpoint.
// The boiler's own P15 program is not on the bus.
import { HubCard, html, css, nothing, c, ca, register } from "../base";
import { Key } from "../names";

const DAYS_ = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

class ImmergasLegionellaCard extends HubCard {
  private open: boolean | null = null;   // collapsed by default; option expanded: true opens it

  private sel(k: Key, n: number) {
    const opts: string[] = this.attr(k, "options") ?? [], opt = opts[n];
    if (opt) this.call("select", "select_option", k, { option: opt });
  }

  /** start time from the time entity "HH:MM:SS" */
  private tm() {
    const s = this.s("hub_leg_time") ?? "", m = /^(\d\d):(\d\d)/.exec(s);
    return m ? { h: +m[1], m: +m[2] } : null;
  }

  private bumpTime(d: number) {
    const t = this.tm();
    if (!t) return;
    const v = ((t.h * 60 + t.m + d) % 1440 + 1440) % 1440;
    this.call("time", "set_value", "hub_leg_time", { time: `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}:00` });
  }

  /** the enable toggle (the base switchRow is blocked by writeLocked, which guards F1/F2 writes only) */
  private enableRow() {
    const act = this.on("hub_leg_enable"), bad = this.bad("hub_leg_enable");
    return html`<div class="sl2" style="background:${act ? ca("red", 0.10) : "rgba(var(--ih-ov-rgb), .04)"};border:1px solid ${act ? ca("red", 0.35) : "rgba(var(--ih-ov-rgb), .08)"}">
      <ha-icon icon="mdi:bacteria-outline" style="color:${c(act ? "red" : "overlay2")}"></ha-icon>
      <div class="cx" @click=${() => this.moreInfo("hub_leg_enable")}><div class="sn">${this.t("Cykl z huba", "Cycle from the hub")}
        <span style="color:${c(act ? "red" : "overlay2")};font-weight:700">· ${act ? this.t("włączony", "on") : this.t("wyłączony", "off")}</span></div>
        <div class="ss">${act ? this.t("harmonogram aktywny", "schedule active") : this.t("harmonogram zatrzymany", "schedule stopped")}</div></div>
      <div class="tgl ${bad ? "dis" : ""}" style="background:${act ? ca("red", 0.35) : "rgba(var(--ih-ov-rgb), .08)"}"
        @click=${() => !bad && this.call("switch", act ? "turn_off" : "turn_on", "hub_leg_enable")}>
        <div class="kn" style="left:${act ? 23 : 3}px;background:${act ? c("red") : c("overlay1")}"></div></div></div>`;
  }

  protected body() {
    if (!this.eid("hub_leg_now")) return html`<div class="note">${this.t("Brak pakietu hub_legionella.", "The hub_legionella package is not loaded.")}</div>`;
    const run = this.on("hub_leg_running"), state = this.s("hub_leg_state") ?? "", on = this.on("hub_leg_enable");
    const opts: string[] = this.attr("hub_leg_every", "options") ?? [], ev = opts.indexOf(this.s("hub_leg_every") ?? "");
    const dOpts: string[] = this.attr("hub_leg_day", "options") ?? [], day = dOpts.indexOf(this.s("hub_leg_day") ?? "");
    const t = this.tm();
    const col = run ? "red" : on ? "teal" : "overlay2";
    const open = this.open ?? !!this.config.expanded;
    const pick = (active: boolean, label: string, col2: string, click: () => void) => html`<div class="pk" style=${active
      ? `background:${ca(col2, 0.3)};border:1px solid ${ca(col2, 0.85)};color:${c(col2)}`
      : "background:rgba(var(--ih-ov-rgb), .05);border:1px solid rgba(var(--ih-ov-rgb), .1)"} @click=${click}>${label}</div>`;
    // tile in the same shape as the recirculation card: - on the left, caption + value centred, + on the right
    const tile = (k: Key, icon: string, label: string, unit: string) => {
      const so = this.so(k);
      if (!so) return nothing;
      const a = so.attributes ?? {}, v = parseFloat(so.state), step = a.step ?? 1;
      const set = (dir: number) => {
        if (isNaN(v)) return;
        const nv = Math.round(Math.min(a.max ?? 1e9, Math.max(a.min ?? -1e9, v + dir * step)) * 1e4) / 1e4;
        this.call("number", "set_value", k, { value: nv });
      };
      return html`<div class="price" style="background:${ca("teal", 0.07)};border:1px solid ${ca("teal", 0.22)}">
        <div class="btn" @click=${() => set(-1)}><ha-icon icon="mdi:minus"></ha-icon></div>
        <div class="pc" @click=${() => this.moreInfo(k)}><div class="lbl"><ha-icon icon=${icon} style="--mdc-icon-size:13px"></ha-icon> ${label}</div>
          <div class="pv" style="color:${c("teal")}">${this.f(v, 0)} ${unit}</div></div>
        <div class="btn" @click=${() => set(1)}><ha-icon icon="mdi:plus"></ha-icon></div></div>`;
    };
    return html`
      <div class="sh" @click=${() => { this.open = !open; this.requestUpdate(); }}>
        <ha-icon icon="mdi:bacteria-outline"></ha-icon>
        <span class="ttl">${this.t("Anty-legionella", "Anti-legionella")}</span>
        <span class="des">${this.t("cykl prowadzi hub", "hub-driven cycle")}</span>
        <span class="sum" style="color:${c(col)}">${state}</span>
        <ha-icon class="chev" icon=${open ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
      </div>
      ${!open ? nothing : html`
      <div class="nb" style="background:${ca("teal", 0.08)};border:1px solid ${ca("teal", 0.25)};color:${c("teal")}">
        <ha-icon icon="mdi:information-outline"></ha-icon>
        <span>${this.t("Cykl prowadzi hub, nie piec – przełącza program czasowy CWU na ręczny i podnosi nastawę; po zakończeniu program wraca na Auto, a nastawę przywraca piec.",
          "Run by the hub, not the boiler – it switches the DHW time program to manual and raises the setpoint; at the end the program returns to Auto and the boiler restores its own setpoint.")}</span></div>
      ${this.enableRow()}
      <div class="sched">
        <div class="srow"><span class="al">${this.t("Co", "Every")}</span>
          <div class="picks">${[0, 1, 2, 3].map((n) => pick(n === ev, this.t(`${n + 1} tyg.`, n === 0 ? "1 week" : `${n + 1} weeks`), "teal",
            () => this.sel("hub_leg_every", n)))}</div></div>
        <div class="srow w"><span class="al">${this.t("Kiedy", "When")}</span>
          <div class="picks">${DAYS_.map((d, n) => pick(n === day, this.pl ? DAYS_PL[n] : d, "teal", () => this.sel("hub_leg_day", n)))}</div>
          <div class="tw"><span class="at">${this.t("o", "at")}</span>
            <div class="tm" style="background:rgba(var(--ih-ov-rgb), .05);border:1px solid rgba(var(--ih-ov-rgb), .1)">
              <div class="btn xs" @click=${() => this.bumpTime(-15)}><ha-icon icon="mdi:minus"></ha-icon></div>
              <div class="tv" @click=${() => this.moreInfo("hub_leg_time")}>${t ? `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}` : "--:--"}</div>
              <div class="btn xs" @click=${() => this.bumpTime(15)}><ha-icon icon="mdi:plus"></ha-icon></div></div></div></div>
      </div>
      <div class="row two">
        ${tile("hub_leg_target", "mdi:thermometer-high", this.t("Temperatura", "Target"), "°C")}
        ${tile("hub_leg_timeout", "mdi:timer-outline", this.t("Limit", "Timeout"), "h")}
      </div>
      <div class="row">
        <div class="rcb ${run ? "run" : ""}" style=${run
          ? `background:${ca("red", 0.16)};border:1px solid ${ca("red", 0.7)};color:${c("red")}`
          : `background:${ca("teal", 0.3)};border:1px solid ${ca("teal", 0.8)};color:${c("teal")}`}
          @click=${() => this.call("button", "press", "hub_leg_now")}>
          <ha-icon icon=${run ? "mdi:stop" : "mdi:bacteria-outline"}></ha-icon>
          <div><div class="bl">${run ? this.t("Zatrzymaj", "Stop") : this.t("Uruchom teraz", "Run now")}</div>
            <div class="bs">${run ? this.t("przerwij i przywróć nastawę pieca", "cancel and restore the boiler's setpoint")
              : this.t("cykl legionelli od razu, poza harmonogramem", "legionella cycle now, outside the schedule")}</div></div></div>
      </div>`}`;
  }

  static styles = [HubCard.styles, css`
    ha-card { padding: 8px 12px; }   /* same as the Bus map, so the collapsed bar matches it */
    .sh { cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: 2px; flex-wrap: wrap; row-gap: 2px; }
    .sh > ha-icon { --mdc-icon-size: 20px; }
    .ttl { font-size: 10.5px; font-weight: 800; opacity: var(--ih-o55, .55); letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
    .sum { flex: 0 1 auto; min-width: 0; font-size: 10.5px; font-weight: 700; text-align: right; white-space: normal; overflow-wrap: anywhere; }
    .des { flex: 1; font-size: 10.5px; opacity: var(--ih-o45, .45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chev { --mdc-icon-size: 18px; opacity: .55; margin-left: 6px; }
    .rcb { flex: 1 1 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
      padding: 5px 12px; border-radius: 12px; cursor: pointer; min-height: 46px; box-sizing: border-box; }
    .rcb.run { opacity: .9; }
    .rcb ha-icon { --mdc-icon-size: 20px; flex: none; }
    .rcb .bl { font-size: 12.5px; font-weight: 800; line-height: 1.2; }
    .rcb .bs { font-size: 9.5px; opacity: .78; line-height: 1.2; }
    .sl2 { display: flex; align-items: center; gap: 10px; margin-top: 6px; padding: 8px 10px; border-radius: 14px; }
    .sl2 > ha-icon { --mdc-icon-size: 24px; flex: none; }
    .sl2 .sn { font-size: 13px; font-weight: 800; }
    .sl2 .ss { font-size: 10.5px; opacity: var(--ih-o65, .65); }
    .sched { margin-top: 8px; }
    .srow { display: grid; grid-template-columns: 62px 1fr; align-items: center; gap: 8px; margin-top: 6px; }
    .srow.w { grid-template-columns: 62px 1fr auto; }
    .srow .picks { justify-content: flex-start; }
    .tw { display: flex; align-items: center; gap: 6px; }
    .at { font-size: 11px; opacity: .62; }
    .tm { display: flex; align-items: center; gap: 2px; padding: 1px 3px; border-radius: 9px; flex: none; }
    .tm .tv { font-size: 12px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; cursor: pointer; }
    .tm .btn.xs { width: 22px; height: 22px; }
    .row.two { flex-wrap: nowrap; align-items: stretch; }
    .row.two > * { flex: 1 1 0; min-width: 0; box-sizing: border-box; }
    .nb { display: flex; align-items: flex-start; gap: 7px; margin-top: 6px; padding: 7px 9px; border-radius: 10px; font-size: 11px; line-height: 1.35; }
    .nb ha-icon { --mdc-icon-size: 15px; flex: none; opacity: .9; }
    .price { flex: 1 1 150px; min-width: 0; display: flex; align-items: center; gap: 7px; padding: 6px 9px; border-radius: 12px; min-height: 46px; box-sizing: border-box; }
    .pc { cursor: pointer; flex: 1; min-width: 0; text-align: center; }
    .price .btn { width: 28px; height: 28px; border-radius: 9px; }
    .price .btn ha-icon { --mdc-icon-size: 17px; }
    .price .pv { font-size: 13.5px; font-weight: 800; }
    .price .lbl { font-size: 9.5px; }
    .al { font-size: 11px; font-weight: 700; opacity: .75; }
    .picks { display: flex; gap: 4px; flex-wrap: wrap; }
    .pk { cursor: pointer; min-width: 26px; height: 24px; padding: 0 6px; border-radius: 7px; display: flex;
      align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .rcb { flex: 1 1 180px; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 9px;
      padding: 8px 12px; border-radius: 12px; cursor: pointer; }
    .rcb.run { opacity: .9; }
    .rcb ha-icon { --mdc-icon-size: 20px; flex: none; }
    .rcb .bx { min-width: 0; }
    .rcb .bl { font-size: 12.5px; font-weight: 800; line-height: 1.2; }
    .rcb .bs { font-size: 9.5px; opacity: .75; line-height: 1.2; }
  `];
}

register("immergas-legionella-card", ImmergasLegionellaCard, "Immergas – Anty-legionella / Anti-legionella",
  "Cykl dezynfekcji CWU sterowany z huba: co 1–4 tygodnie, wybrany dzień i godzina, temperatura docelowa, limit czasu");
