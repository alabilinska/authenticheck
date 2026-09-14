import { describe, expect, it } from "vitest";
import { emptyDraft, toSaveCommand } from "./draft";

describe("toSaveCommand", () => {
  it("takes the listing data from the start card and the answers as the observation", () => {
    const command = toSaveCommand({
      ...emptyDraft,
      listingUrl: "  https://example.com/oferta/7  ",
      declaredYear: "2009",
      price: "3200,50",
      hardware: "classic-aged-brass",
      thread: "yes",
    });
    expect(command.listingUrl).toBe("https://example.com/oferta/7");
    expect(command.declaredYear).toBe(2009);
    expect(command.price).toBe(3200.5);
    expect(command.observation.hardware).toBe("classic-aged-brass");
    expect(command.observation.declaredYear).toBe(2009);
    expect(command.observation.thread).toBe("yes");
  });

  it("sends empty optional fields as null and unanswered questions as unknown", () => {
    const command = toSaveCommand({ ...emptyDraft, listingUrl: "https://example.com" });
    expect(command.declaredYear).toBeNull();
    expect(command.price).toBeNull();
    expect(command.observation.zipper).toBe("unknown");
    expect(command.observation.bales).toBe("unknown");
  });
});
