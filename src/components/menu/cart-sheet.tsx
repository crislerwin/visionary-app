"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart-store";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        {mounted && totalItems > 0 && (
          <Badge
            data-testid="cart-badge"
            variant="destructive"
            className="absolute -top-2 -right-2 size-5 flex items-center justify-center p-0 text-xs"
          >
            {totalItems}
          </Badge>
        )}
      </Button>

      {/* Cart Sheet */}
      <Sheet open={isOpen} onOpenChange={closeCart}>
        <SheetContent className="flex flex-col h-full w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Carrinho
              {totalItems > 0 && <Badge variant="secondary">{totalItems} itens</Badge>}
            </SheetTitle>
            <SheetDescription>
              {tenantName ? `Pedido em ${tenantName}` : "Seu pedido"}
            </SheetDescription>
          </SheetHeader>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto py-4 px-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <ShoppingCart className="size-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Carrinho vazio</p>
                <p className="text-sm">Adicione produtos para começar seu pedido</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {/* Product Image */}
                    <div className="relative size-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <ShoppingCart className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* Middle: Product Info + Quantity Controls */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h4 className="font-medium truncate text-sm">{item.productName}</h4>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-sm font-medium text-primary">
                        R${" "}
                        {item.price.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Right: Remove + Item Total */}
                    <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0 self-stretch">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <span className="text-sm font-semibold">
                        R${" "}
                        {(item.price * item.quantity).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Summary + Checkout */}
          {items.length > 0 && (
            <div className="flex flex-col gap-3 border-t mt-auto px-4 py-4">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
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
              <Separator />
              <Button className="w-full" size="lg">
                Finalizar Pedido
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
