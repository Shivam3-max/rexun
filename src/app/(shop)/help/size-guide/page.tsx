"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * The one question every fan and geyser buyer asks and almost no site answers:
 * what size do I need? Two short calculators, plain language, and a link
 * straight into the products that fit the answer.
 */

const SWEEPS = [
  { max: 25, sweep: "600 mm", note: "Small bathroom, store or study nook" },
  { max: 50, sweep: "900 mm", note: "Small bedroom or kitchen" },
  { max: 80, sweep: "1200 mm", note: "Standard bedroom — the size most homes use" },
  { max: 120, sweep: "1400 mm", note: "Large bedroom or living room" },
  { max: Infinity, sweep: "Two fans", note: "Bigger than one fan can cover evenly" },
];

export default function SizeGuidePage() {
  const [len, setLen] = useState("12");
  const [wide, setWide] = useState("10");
  const [high, setHigh] = useState("10");
  const [people, setPeople] = useState("3");
  const [use, setUse] = useState<"bucket" | "shower">("bucket");

  const area = Number(len) * Number(wide);
  const fan = SWEEPS.find((s) => area <= s.max) ?? SWEEPS[SWEEPS.length - 1];
  const tallCeiling = Number(high) > 11;

  const n = Number(people);
  const litres =
    use === "bucket"
      ? n <= 2 ? 10 : n <= 4 ? 15 : 25
      : n <= 2 ? 15 : n <= 4 ? 25 : 25;
  const geyserNote =
    use === "shower" && n > 4
      ? "25 L is the largest we stock — for more than four shower users, two units in separate bathrooms works better than one big tank."
      : use === "shower"
        ? "Showers use roughly twice the hot water of a bucket bath."
        : "A bucket bath uses about 15–20 litres of mixed water.";

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8">
      <h1 className="text-[28px] font-bold text-ink sm:text-[34px]">Which size do I need?</h1>
      <p className="mt-2 max-w-[60ch] text-[15.5px] text-ink-2">
        Two questions we get more than any other. Answer them here and buy the right thing
        the first time — a fan that is too small never cools the room, and a geyser that is
        too big just heats water you never use.
      </p>

      {/* ------------------------------------------------------------- fan */}
      <section className="mt-8 rounded-card border border-line bg-card p-5 sm:p-6">
        <h2 className="text-[20px] font-bold text-ink">Ceiling fan size</h2>
        <p className="mt-1 text-[14px] text-ink-2">Measure the room in feet — pacing it out is close enough.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Num label="Room length (ft)" value={len} onChange={setLen} />
          <Num label="Room width (ft)" value={wide} onChange={setWide} />
          <Num label="Ceiling height (ft)" value={high} onChange={setHigh} />
        </div>

        <div className="mt-5 rounded-card border border-rex-red/25 bg-rex-red-tint p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-rex-red">Buy this</p>
          <p className="mt-1 text-[24px] font-bold text-ink tnum">{fan.sweep}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            {fan.note} · your room is <span className="tnum">{area || 0} sq ft</span>
          </p>
          {tallCeiling && (
            <p className="mt-2 text-[13.5px] font-semibold text-ink">
              Your ceiling is over 11 ft — add a down rod so the fan hangs about 9–10 ft above
              the floor, or the air never reaches you.
            </p>
          )}
          <Link
            href="/c/ceiling-fans"
            className="mt-3 inline-block rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark"
          >
            See ceiling fans
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------- geyser */}
      <section className="mt-6 rounded-card border border-line bg-card p-5 sm:p-6">
        <h2 className="text-[20px] font-bold text-ink">Geyser capacity</h2>
        <p className="mt-1 text-[14px] text-ink-2">Count the people using that one bathroom, back to back.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Num label="People using it" value={people} onChange={setPeople} max={8} />
          <div>
            <span className="text-[13px] font-bold text-ink">How do they bathe?</span>
            <div className="mt-1.5 flex gap-2">
              {(["bucket", "shower"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUse(u)}
                  className={`flex-1 rounded border px-3 py-2.5 text-[14px] font-semibold capitalize ${
                    use === u ? "border-rex-red bg-rex-red-tint text-rex-red" : "border-line-2 text-ink"
                  }`}
                >
                  {u === "bucket" ? "Bucket" : "Shower"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-card border border-rex-red/25 bg-rex-red-tint p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-rex-red">Buy this</p>
          <p className="mt-1 text-[24px] font-bold text-ink tnum">{litres} litre storage geyser</p>
          <p className="mt-1 text-[14px] text-ink-2">{geyserNote}</p>
          <Link
            href="/c/geysers-water-heaters"
            className="mt-3 inline-block rounded bg-rex-red px-4 py-2.5 text-[14px] font-bold text-white hover:bg-rex-red-dark"
          >
            See geysers
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-card border border-line bg-card p-5 sm:p-6">
        <h2 className="text-[20px] font-bold text-ink">Light brightness, roughly</h2>
        <p className="mt-2 text-[14.5px] text-ink-2">
          Older bulbs were sold in watts. LEDs use far less power for the same light, so
          match them like this:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-[14px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <th className="py-2 font-semibold">Old bulb</th>
                <th className="py-2 font-semibold">LED equivalent</th>
                <th className="py-2 font-semibold">Good for</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {[
                ["40 W", "5 W", "Bedside, passage"],
                ["60 W", "9 W", "Bedroom, small room"],
                ["100 W", "12–15 W", "Living room, kitchen"],
                ["Tubelight", "20 W batten", "Kitchen counter, study"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-b border-line text-ink-2 last:border-0">
                  <td className="py-2">{a}</td>
                  <td className="py-2 font-semibold text-ink">{b}</td>
                  <td className="py-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/d/lighting" className="mt-4 inline-block text-[14px] font-bold text-rex-red hover:underline">
          Browse lighting →
        </Link>
      </section>
    </div>
  );
}

function Num({
  label, value, onChange, max = 60,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold text-ink">{label}</label>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (v === "" || Number(v) <= max) onChange(v);
        }}
        className="mt-1 w-full rounded border border-line-2 px-3 py-2.5 text-[15px] tnum outline-none focus:border-rex-red"
      />
    </div>
  );
}
