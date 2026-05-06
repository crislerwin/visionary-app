import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BankAccountForm } from "./BankAccountForm";
import { BankAccountType } from "@prisma/client";

// Mock the API
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/trpc/react", () => ({
  api: {
    bankAccount: {
      create: {
        useMutation: () => ({
          mutate: mockCreate,
          isPending: false,
        }),
      },
      update: {
        useMutation: () => ({
          mutate: mockUpdate,
          isPending: false,
        }),
      },
    },
  },
}));

describe("BankAccountForm", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form correctly", () => {
    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("New Bank Account")).toBeInTheDocument();
    expect(screen.getByText("Account Name")).toBeInTheDocument();
    expect(screen.getByText("Account Type")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Initial Balance")).toBeInTheDocument();
  });

  it("renders edit form without initial balance field", () => {
    const account = {
      id: "account-1",
      name: "Main Account",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      initialBalance: 1000,
    };

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        account={account}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Edit Bank Account")).toBeInTheDocument();
    expect(screen.queryByText("Initial Balance")).not.toBeInTheDocument();
  });

  it("submits create form with valid data", async () => {
    const user = userEvent.setup();
    mockCreate.mockImplementation(() => {
      mockOnOpenChange(false);
      mockOnSuccess();
    });

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill form
    await user.type(
      screen.getByPlaceholderText("e.g., Main Checking Account"),
      "My Savings"
    );
    await user.type(screen.getByPlaceholderText("0.00"), "5000");

    // Submit
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Savings",
          initialBalance: 5000,
          currency: "BRL",
          type: BankAccountType.CHECKING,
        })
      );
    });
  });

  it("shows validation errors for empty name", async () => {
    const user = userEvent.setup();

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Try to submit empty form
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await user.click(screen.getByText("Cancel"));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits update form with correct data", async () => {
    const user = userEvent.setup();
    mockUpdate.mockImplementation(() => {
      mockOnOpenChange(false);
      mockOnSuccess();
    });

    const account = {
      id: "account-1",
      name: "Old Name",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      initialBalance: 1000,
    };

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        account={account}
        onSuccess={mockOnSuccess}
      />
    );

    // Update name
    const nameInput = screen.getByPlaceholderText("e.g., Main Checking Account");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Account Name");

    // Submit
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "account-1",
          name: "Updated Account Name",
        })
      );
    });
  });

  it("allows selecting different account types", async () => {
    const user = userEvent.setup();

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Open select
    await user.click(screen.getByText("Select account type"));

    // Should have all account types
    expect(screen.getByText("Checking Account")).toBeInTheDocument();
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
  });

  it("allows selecting different currencies", async () => {
    const user = userEvent.setup();

    render(
      <BankAccountForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Open currency select
    await user.click(screen.getByText("Select currency"));

    // Should have currencies
    expect(screen.getByText("BRL - Brazilian Real")).toBeInTheDocument();
    expect(screen.getByText("USD - US Dollar")).toBeInTheDocument();
    expect(screen.getByText("EUR - Euro")).toBeInTheDocument();
  });
});
