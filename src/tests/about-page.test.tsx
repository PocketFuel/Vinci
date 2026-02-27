import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPlasmonicPage } from "../pages/AboutPlasmonicPage";

describe("AboutPlasmonicPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders embedded deck when assets are available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 200,
        })
      ) as unknown as typeof fetch
    );

    render(
      <MemoryRouter>
        <AboutPlasmonicPage />
      </MemoryRouter>
    );

    expect(screen.getByText("About Plasmonic…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTitle("Plasmonic legacy deck")).toBeInTheDocument();
    });
  });

  it("shows warning when assets are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 404,
        })
      ) as unknown as typeof fetch
    );

    render(
      <MemoryRouter>
        <AboutPlasmonicPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Some reference assets are unavailable")).toBeInTheDocument();
    });
  });
});
