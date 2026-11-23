import { describe, expect, it } from "vitest";
import {
  isWeekend,
  isOntarioStatutoryHoliday,
  isBusinessDay,
  getBusinessDaysDiff,
  addBusinessDays,
} from "../src/utils/business-days";

describe("Business Day Arithmetic & America/Toronto DST-Safe Logic", () => {
  it("identifies weekends correctly in America/Toronto time", () => {
    // Saturday: 2026-11-21
    const saturday = new Date("2026-11-21T15:00:00Z");
    // Sunday: 2026-11-22
    const sunday = new Date("2026-11-22T15:00:00Z");
    // Monday: 2026-11-23
    const monday = new Date("2026-11-23T15:00:00Z");

    expect(isWeekend(saturday)).toBe(true);
    expect(isWeekend(sunday)).toBe(true);
    expect(isWeekend(monday)).toBe(false);
  });

  it("identifies Ontario statutory holidays", () => {
    const canadaDay = new Date("2026-07-01T12:00:00Z");
    const christmas = new Date("2026-12-25T12:00:00Z");
    const regularWednesday = new Date("2026-07-08T12:00:00Z");

    expect(isOntarioStatutoryHoliday(canadaDay)).toBe(true);
    expect(isOntarioStatutoryHoliday(christmas)).toBe(true);
    expect(isOntarioStatutoryHoliday(regularWednesday)).toBe(false);
  });

  it("computes business days between two dates, excluding weekends and holidays", () => {
    // From Friday 2026-11-20 to Tuesday 2026-11-24:
    // Excludes Sat (21) and Sun (22). Days counted: Mon (23), Tue (24) -> 2 business days
    const diff = getBusinessDaysDiff("2026-11-20T12:00:00Z", "2026-11-24T12:00:00Z");
    expect(diff).toBe(2);
  });

  it("DST SPRING FORWARD: safely calculates 5 business days across the March DST transition week", () => {
    // In 2026, North American DST starts Sunday, March 8 (clocks jump 2:00 AM -> 3:00 AM)
    // Week: Monday March 2 to Monday March 9 (5 business days across DST boundary)
    const start = new Date("2026-03-02T12:00:00Z");
    const end = new Date("2026-03-09T12:00:00Z");

    const diff = getBusinessDaysDiff(start, end);
    expect(diff).toBe(5);

    const targetDate = addBusinessDays(start, 5);
    expect(targetDate.getUTCDate()).toBe(9);
  });

  it("DST FALL BACK: safely calculates 5 business days across the November DST transition week", () => {
    // In 2026, North American DST ends Sunday, November 1 (clocks repeat 2:00 AM -> 1:00 AM)
    // Week: Monday Oct 26 to Monday Nov 2 (5 business days across DST boundary)
    const start = new Date("2026-10-26T12:00:00Z");
    const end = new Date("2026-11-02T12:00:00Z");

    const diff = getBusinessDaysDiff(start, end);
    expect(diff).toBe(5);

    const targetDate = addBusinessDays(start, 5);
    expect(targetDate.getUTCDate()).toBe(2);
  });
});
