import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLogin from "./AdminLogin";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const mockNavigate = jest.fn();

jest.mock("@/lib/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("AdminLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockReset();
  });

  it("signs in admin directly when password rotation is not required", async () => {
    const login = jest.fn().mockResolvedValue({ role: "admin", name: "Admin" });
    useAuth.mockReturnValue({ login });

    render(<AdminLogin />);

    await userEvent.type(screen.getByTestId("admin-password"), "Admin@123");
    await userEvent.click(screen.getByTestId("admin-submit"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("admin@cardost.in", "Admin@123");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });

    expect(screen.queryByTestId("admin-first-password-change-form")).not.toBeInTheDocument();
  });

  it("handles PASSWORD_CHANGE_REQUIRED and completes first-login password update", async () => {
    const login = jest
      .fn()
      .mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: {
              code: "PASSWORD_CHANGE_REQUIRED",
              message: "Admin password must be changed before login.",
            },
          },
        },
      })
      .mockResolvedValueOnce({ role: "admin", name: "Admin" });
    useAuth.mockReturnValue({ login });
    api.post.mockResolvedValue({ data: { ok: true } });

    render(<AdminLogin />);

    await userEvent.clear(screen.getByTestId("admin-email"));
    await userEvent.type(screen.getByTestId("admin-email"), "admin@cardost.in");
    await userEvent.type(screen.getByTestId("admin-password"), "Admin@123");
    await userEvent.click(screen.getByTestId("admin-submit"));

    expect(await screen.findByTestId("admin-first-password-change-form")).toBeInTheDocument();
    expect(screen.getByTestId("admin-current-password")).toHaveValue("Admin@123");

    await userEvent.type(screen.getByTestId("admin-new-password"), "NewAdmin@123");
    await userEvent.type(screen.getByTestId("admin-confirm-password"), "NewAdmin@123");
    await userEvent.click(screen.getByTestId("admin-change-password-submit"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/admin/first-login-password-change", {
        email: "admin@cardost.in",
        current_password: "Admin@123",
        new_password: "NewAdmin@123",
      });
    });

    await waitFor(() => {
      expect(login).toHaveBeenLastCalledWith("admin@cardost.in", "NewAdmin@123");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });
  });
});
