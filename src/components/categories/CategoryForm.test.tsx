import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryForm } from "./CategoryForm";
import { CategoryType } from "@prisma/client";

// Mock the API
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/trpc/react", () => ({
  api: {
    category: {
      list: {
        useQuery: () => ({
          data: {
            categories: [
              { id: "cat-1", name: "Food", type: CategoryType.EXPENSE },
              { id: "cat-2", name: "Rent", type: CategoryType.EXPENSE },
              { id: "cat-3", name: "Salary", type: CategoryType.INCOME },
            ],
          },
          isLoading: false,
        }),
      },
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

describe("CategoryForm", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form correctly", () => {
    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("New Category")).toBeInTheDocument();
    expect(screen.getByText("Category Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
  });

  it("renders edit form with category data", () => {
    const category = {
      id: "cat-1",
      name: "Food",
      type: CategoryType.EXPENSE,
      color: "#F59E0B",
      icon: "utensils",
      parentId: null,
    };

    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        category={category}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Edit Category")).toBeInTheDocument();
  });

  it("submits create form with valid data", async () => {
    const user = userEvent.setup();
    mockCreate.mockImplementation(() => {
      mockOnOpenChange(false);
      mockOnSuccess();
    });

    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill form
    await user.type(
      screen.getByPlaceholderText("e.g., Food, Salary, Utilities"),
      "Entertainment"
    );

    // Submit
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Entertainment",
          type: CategoryType.EXPENSE,
          color: "#6366F1",
          icon: "circle",
        })
      );
    });
  });

  it("shows validation errors for empty name", async () => {
    const user = userEvent.setup();

    render(
      <CategoryForm
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
      <CategoryForm
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

    const category = {
      id: "cat-1",
      name: "Old Category",
      type: CategoryType.EXPENSE,
      color: "#6366F1",
      icon: "circle",
      parentId: null,
    };

    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        category={category}
        onSuccess={mockOnSuccess}
      />
    );

    // Update name
    const nameInput = screen.getByPlaceholderText("e.g., Food, Salary, Utilities");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Category");

    // Submit
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cat-1",
          name: "Updated Category",
        })
      );
    });
  });

  it("allows selecting different types", async () => {
    const user = userEvent.setup();

    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Open type select
    await user.click(screen.getByText("Select type"));

    // Should have both types
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Expense")).toBeInTheDocument();
  });

  it("shows parent category selector for new categories", () => {
    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Parent Category (Optional)")).toBeInTheDocument();
  });

  it("hides parent category selector when editing", () => {
    const category = {
      id: "cat-1",
      name: "Food",
      type: CategoryType.EXPENSE,
      color: "#F59E0B",
      icon: "utensils",
      parentId: null,
    };

    render(
      <CategoryForm
        open={true}
        onOpenChange={mockOnOpenChange}
        category={category}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText("Parent Category (Optional)")).not.toBeInTheDocument();
  });
});
