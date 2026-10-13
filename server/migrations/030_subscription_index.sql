-- Subscriptions are found by the user and, from Stripe's messages, by customer.
create index subscriptions_customer_idx on public.subscriptions (stripe_customer) where stripe_customer is not null;
