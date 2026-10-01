# Coding Standards

These rules apply to all new or modified code in the monorepo.

## Comments

Do not add comments to the code. Use clear names for variables, functions and constants.

Comments are only acceptable when strictly necessary, for example to explain a complex regular expression, an unusual business rule or an external limitation.

Bad:

```ts
// Checks whether the user is active
if (user.active) {
  sendWelcomeEmail(user.email);
}
```

Good:

```ts
if (user.active) {
  sendWelcomeEmail(user.email);
}
```

Acceptable:

```ts
const BRAZILIAN_PHONE_REGEX = /^\+55\d{2}9?\d{8}$/;

// Accepts mobile numbers with or without the ninth digit for legacy records.
const isValidPhone = BRAZILIAN_PHONE_REGEX.test(phone);
```

## File Size

Never create classes or `.ts` files with more than 100 lines.

If a file goes past that limit, split its responsibilities into smaller files.

Bad:

```ts
// order-service.ts with 180 lines
export class OrderService {
  createOrder() {}
  cancelOrder() {}
  calculateTaxes() {}
  sendConfirmation() {}
  refundPayment() {}
}
```

Good:

```ts
// order-service.ts
export class OrderService {
  createOrder() {}
  cancelOrder() {}
}
```

```ts
// order-tax-service.ts
export class OrderTaxService {
  calculateTaxes() {}
}
```

```ts
// order-notification-service.ts
export class OrderNotificationService {
  sendConfirmation() {}
}
```

## Function and Method Size

Methods and functions must have at most 30 lines.

If the implemented behavior is larger than that, split it into smaller functions with names that express each step.

Bad:

```ts
function checkout(cart: Cart) {
  validateCart(cart);
  const subtotal = calculateSubtotal(cart.items);
  const discount = calculateDiscount(cart.coupon);
  const shipping = calculateShipping(cart.address);
  const total = subtotal - discount + shipping;
  const payment = chargePayment(cart.paymentMethod, total);
  const order = saveOrder(cart, payment);
  sendOrderConfirmation(order);
  return order;
}
```

Good:

```ts
function checkout(cart: Cart) {
  validateCart(cart);
  const total = calculateCartTotal(cart);
  const payment = chargePayment(cart.paymentMethod, total);
  return finishOrder(cart, payment);
}

function finishOrder(cart: Cart, payment: Payment) {
  const order = saveOrder(cart, payment);
  sendOrderConfirmation(order);
  return order;
}
```

## Conditionals

Do not chain more than 3 `if`/`else` statements.

Prefer guard clauses, such as early `return`, to avoid piling up conditional logic.

Bad:

```ts
function getDiscount(user: User) {
  if (user.active) {
    if (user.hasSubscription) {
      if (user.ordersCount > 10) {
        return 20;
      }
    }
  }

  return 0;
}
```

Good:

```ts
function getDiscount(user: User) {
  if (!user.active) return 0;
  if (!user.hasSubscription) return 0;
  if (user.ordersCount <= 10) return 0;
  return 20;
}
```

## Parameters

Avoid using more than 3 parameters in methods and functions.

If more data needs to be passed, create a parameter object.

Bad:

```ts
function createUser(name: string, email: string, phone: string, role: Role) {
  return users.create({ name, email, phone, role });
}
```

Good:

```ts
type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  role: Role;
};

function createUser(input: CreateUserInput) {
  return users.create(input);
}
```

## Blank Lines

Avoid blank lines inside methods and functions.

Blank lines between class members or between functions in a file are allowed.

Bad:

```ts
function calculateTotal(items: Item[]) {
  const subtotal = calculateSubtotal(items);

  const taxes = calculateTaxes(subtotal);

  return subtotal + taxes;
}
```

Good:

```ts
function calculateTotal(items: Item[]) {
  const subtotal = calculateSubtotal(items);
  const taxes = calculateTaxes(subtotal);
  return subtotal + taxes;
}
```

Also good:

```ts
function calculateSubtotal(items: Item[]) {
  return items.reduce((total, item) => total + item.price, 0);
}

function calculateTaxes(subtotal: number) {
  return subtotal * TAX_RATE;
}
```

## Magic Numbers and Strings

Extract magic numbers and strings into constants with names that make the concept clear.

Bad:

```ts
function canReceiveFreeShipping(orderTotal: number) {
  return orderTotal >= 150;
}
```

Good:

```ts
const FREE_SHIPPING_MINIMUM = 150;

function canReceiveFreeShipping(orderTotal: number) {
  return orderTotal >= FREE_SHIPPING_MINIMUM;
}
```

Bad:

```ts
if (order.status === "paid") {
  releaseOrder(order.id);
}
```

Good:

```ts
const PAID_ORDER_STATUS = "paid";

if (order.status === PAID_ORDER_STATUS) {
  releaseOrder(order.id);
}
```

## Variable Declaration

Declare variables close to where they are actually used.

This reduces unnecessary reading and avoids variables staying alive for too long.

Bad:

```ts
function sendReceipt(order: Order) {
  const formattedTotal = formatCurrency(order.total);
  validateOrder(order);
  saveOrder(order);
  emailClient.send(`Total: ${formattedTotal}`);
}
```

Good:

```ts
function sendReceipt(order: Order) {
  validateOrder(order);
  saveOrder(order);
  const formattedTotal = formatCurrency(order.total);
  emailClient.send(`Total: ${formattedTotal}`);
}
```

## Sensitive Data

Never put sensitive data inside the code, such as API keys, tokens, passwords or secrets.

Always use environment variables loaded from an external `.env` file.

Bad:

```ts
const paymentClient = new PaymentClient({
  apiKey: "sk_live_123456789",
});
```

Good:

```ts
const paymentClient = new PaymentClient({
  apiKey: process.env.PAYMENT_API_KEY,
});
```
