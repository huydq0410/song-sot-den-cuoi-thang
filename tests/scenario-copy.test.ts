import assert from "node:assert/strict";
import test from "node:test";
import {
  generateScenarioDeck,
  type GameEvent,
  type ProfileId,
} from "../lib/scenario-engine.ts";

const profiles: ProfileId[] = ["office", "student", "freelancer"];

function generatedEvents() {
  const events: GameEvent[] = [];
  for (const profile of profiles) {
    for (let run = 0; run < 80; run += 1) {
      const deck = generateScenarioDeck(profile, `copy-test-${profile}-${run}`);
      assert.equal(deck.length, 30);
      assert.equal(new Set(deck.map((event) => event.id)).size, 30);
      events.push(...deck);
    }
  }
  return events;
}

test("generated copy stays concise and avoids generic timestamp fragments", () => {
  const events = generatedEvents();
  const forbiddenFragments = [
    /\b\d{1,2}:\d{2}:\d{2}\b/,
    /lịch cá nhân vừa có thay đổi/i,
    /24 giờ để phản hồi/i,
    /một thông báo thứ hai xuất hiện/i,
    /điện thoại rung với lời nhắc mới/i,
  ];

  for (const event of events) {
    assert.ok(
      event.description.length <= 260,
      `${event.title} is too verbose: ${event.description}`,
    );
    for (const pattern of forbiddenFragments) {
      assert.doesNotMatch(event.description, pattern);
    }
  }
});

test("routine and recovery scenarios use topic-aware details", () => {
  const events = generatedEvents();
  const routineAndRecovery = events.filter(
    (event) =>
      event.id.startsWith("daily-") || event.id.startsWith("recovery-"),
  );

  for (const event of routineAndRecovery) {
    assert.doesNotMatch(
      event.description,
      /hạn chót|cần phản hồi|thông báo trên điện thoại/i,
    );
  }

  const coffee = events.find(
    (event) => event.title === "Thói quen cà phê mỗi sáng",
  );
  assert.ok(coffee);
  assert.match(coffee.description, /ngày gần nhất/);
  assert.match(coffee.description, /ghé quán \d+ lần/);

  const overtimeRecovery = events.find(
    (event) => event.title === "Cuối tuần sau chuỗi ngày tăng ca",
  );
  assert.ok(overtimeRecovery);
  assert.match(
    overtimeRecovery.description,
    /làm việc \d+ ngày|ngày bận|khoảng nghỉ/,
  );
});
