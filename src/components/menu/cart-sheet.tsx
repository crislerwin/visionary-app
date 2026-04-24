"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart-store";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";

export function CartSheet() {
  const {
    items,
    isOpen,
    closeCart,
    tenantName,
    getTotalItems,
    getTotalPrice,
    updateQuantity,
    removeItem,
  } = useCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <>
      {/* Cart Button */}
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => useCartStore.getState().openCart()}
      >
        <ShoppingCart className="size-5" />
        {totalItems > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 size-5 flex items-center justify-center p-0 text-xs"
          >
            {totalItems}
          </Badge>
        )}
      </Button>

      {/* Cart Sheet */}
      <Sheet open={isOpen} onOpenChange={closeCart}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Carrinho
              {totalItems > 0 && (
                <Badge variant="secondary">{totalItems} itens</Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {tenantName ? `Pedido em ${tenantName}` : "Seu pedido"}
            </SheetDescription>
          </SheetHeader>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto py-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <ShoppingCart className="size-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Carrinho vazio</p>
                <p className="text-sm">
                  Adicione produtos para começar seu pedido
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card"
                  >
                    {/* Product Image */}
                    <div className="relative size-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <ShoppingCart className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.productName}</h4>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm font-medium text-primary mt-1">
                        R${" "}
                        {item.price.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <SheetFooter className="flex-col gap-4 border-t pt-4">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    R${" "}
                    {totalPrice.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    R${" "}
                    {totalPrice.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <Button className="w-full" size="lg">
                Finalizar Pedido
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
