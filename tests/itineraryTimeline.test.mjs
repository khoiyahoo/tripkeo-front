import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTimelineMoveUpdates,
  findActivitiesAtTime,
  getRelativeActivityTime,
  getTimelinePeriod,
  inferTimeForInsertion,
  sortTimelineActivities,
} from "../src/utils/itineraryTimeline.ts";

const activity = (id, date, startTime, order) => ({
  id,
  date,
  startTime,
  order,
  title: id,
  category: "sights",
});

test("infers a time at the beginning, middle and end", () => {
  const items = [{ startTime: "09:00" }, { startTime: "10:00" }];
  assert.equal(inferTimeForInsertion(items, 0), "08:45");
  assert.equal(inferTimeForInsertion(items, 1), "09:30");
  assert.equal(inferTimeForInsertion(items, 2), "10:15");
});

test("keeps the neighbour time when no minute gap remains", () => {
  assert.equal(
    inferTimeForInsertion([{ startTime: "09:00" }, { startTime: "09:01" }], 1),
    "09:00"
  );
});

test("handles midnight boundaries and period labels", () => {
  assert.equal(inferTimeForInsertion([{ startTime: "00:05" }], 0), "00:00");
  assert.equal(inferTimeForInsertion([{ startTime: "23:55" }], 1), "23:59");
  assert.equal(getTimelinePeriod("01:30"), "lateNight");
  assert.equal(getTimelinePeriod("18:00"), "evening");
});

test("suggests 15 minutes before or after an activity", () => {
  assert.equal(getRelativeActivityTime("09:45", "before"), "09:30");
  assert.equal(getRelativeActivityTime("09:45", "after"), "10:00");
  assert.equal(getRelativeActivityTime("00:05", "before"), "00:00");
  assert.equal(getRelativeActivityTime("23:55", "after"), "23:59");
});

test("sorts by time and uses order for equal times", () => {
  const items = [
    activity("b", "d1", "09:00", 2),
    activity("a", "d1", "09:00", 1),
  ];
  assert.deepEqual(
    sortTimelineActivities(items).map((item) => item.id),
    ["a", "b"]
  );
});

test("finds activities with the exact same valid start time", () => {
  const items = [
    activity("a", "d1", "09:00", 0),
    activity("b", "d1", "09:15", 1),
    activity("c", "d1", "09:00", 2),
  ];
  assert.deepEqual(
    findActivitiesAtTime(items, "09:00").map((item) => item.id),
    ["a", "c"]
  );
  assert.deepEqual(findActivitiesAtTime(items, "invalid"), []);
});

test("moves across days without shifting neighbour times", () => {
  const result = buildTimelineMoveUpdates({
    activitiesByDate: {
      d1: [activity("a", "d1", "08:00", 0)],
      d2: [activity("b", "d2", "10:00", 0), activity("c", "d2", "11:00", 1)],
    },
    activeId: "a",
    targetDate: "d2",
    targetIndex: 1,
  });
  assert.equal(result.placement.startTime, "10:30");
  assert.deepEqual(
    result.updates.find((item) => item.id === "a"),
    {
      id: "a",
      order: 1,
      startTime: "10:30",
      date: "d2",
    }
  );
  assert.equal(
    result.updates.find((item) => item.id === "b").startTime,
    undefined
  );
});

test("reorders within one day without changing the date", () => {
  const result = buildTimelineMoveUpdates({
    activitiesByDate: {
      d1: [
        activity("a", "d1", "08:00", 0),
        activity("b", "d1", "09:00", 1),
        activity("c", "d1", "10:00", 2),
      ],
    },
    activeId: "a",
    targetDate: "d1",
    targetIndex: 2,
  });

  assert.equal(result.placement.date, "d1");
  assert.equal(result.updates.find((item) => item.id === "a").date, undefined);
  assert.deepEqual(
    result.updates.map((item) => item.id),
    ["b", "c", "a"]
  );
});
