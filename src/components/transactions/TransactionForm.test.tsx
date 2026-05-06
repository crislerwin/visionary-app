import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "./TransactionForm";
import { TransactionStatus, TransactionType } from "@prisma/client";

// Mock the API
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/trpc/react", () => ({
  api: {
    bankAccount: {
      list: {
        useQuery: () => ({
          data: [
            { id: "account-1", name: "Main Account", currency: "BRL" },
            { id: "account-2", name: "Savings", currency: "USD" },
          ],
          isLoading: false,
        }),
      },
    },
    category: {
      list: {
        useQuery: () => ({
          data: {
            categories: [
              { id: "cat-1", name: "Food", type: TransactionType.EXPENSE },
              { id: "cat-2", name: "Salary", type: TransactionType.INCOME },
            ],
          },
          isLoading: false,
        }),
      },
    },
    transaction: {
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

describe("TransactionForm", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form correctly", () => {
    render(
      <TransactionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("New Transaction")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Bank Account")).toBeInTheDocument();
  });

  it("renders edit form with transaction data", () => {
    const transaction = {
      id: "trans-1",
      amount: 100,
      type: TransactionType.INCOME,
      description: "Salary",
      date: new Date(),
      bankAccountId: "account-1",
      categoryId: "cat-2",
      status: TransactionStatus.COMPLETED,
    };

    render(
      <TransactionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        transaction={transaction}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
  });

  it("submits create form with valid data", async () => {
    const user = userEvent.setup();
    mockCreate.mockImplementation(() => {
      mockOnOpenChange(false);
      mockOnSuccess();
    });

    render(
      <TransactionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill form
    await user.type(screen.getByPlaceholderText("0.00"), "100");
    await user.type(screen.getByPlaceholderText("Enter description..."), "Test expense");

    // Submit
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(Number),
          description: "Test expense",
        })
      );
    });
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();

    render(
      <TransactionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Try to submit empty form
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Amount must be positive")).toBeInTheDocument();
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TransactionForm
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

    const transaction = {
      id: "trans-1",
      amount: 100,
      type: TransactionType.EXPENSE,
      description: "Old description",
      date: new Date(),
      bankAccountId: "account-1",
      categoryId: null,
      status: TransactionStatus.PENDING,
    };

    render(
      <TransactionForm
        open={true}
        onOpenChange={mockOnOpenChange}
        transaction={transaction}
        onSuccess={mockOnSuccess}
      />
    );

    // Update description
    const descriptionInput = screen.getByPlaceholderText("Enter description...");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated description");

    // Submit
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "trans-1",
          description: "Updated description",
        })
      );
    });
  });
});
