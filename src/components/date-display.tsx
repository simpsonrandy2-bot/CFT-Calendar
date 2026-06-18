"use client";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function localParts(d: Date) {
  return { y: d.getFullYear(), m: d.getMonth(), day: d.getDate() };
}

export function DateDisplay({ start, end }: { start: string; end: string }) {
  const s = new Date(start);
  const e = new Date(end);
  const sp = localParts(s), ep = localParts(e);
  let text: string;
  if (sp.y === ep.y && sp.m === ep.m && sp.day === ep.day) {
    text = `${MONTHS[sp.m]} ${sp.day}, ${sp.y}`;
  } else {
    text = `${MONTHS[sp.m]} ${sp.day} – ${MONTHS[ep.m]} ${ep.day}, ${ep.y}`;
  }
  return <>{text}</>;
}
