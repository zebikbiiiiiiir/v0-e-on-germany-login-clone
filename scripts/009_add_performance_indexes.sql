-- Add performance indexes for faster queries

-- Payment methods table indexes
create index if not exists payment_methods_user_id_idx on public.payment_methods(user_id);
create index if not exists payment_methods_is_default_idx on public.payment_methods(is_default);
create index if not exists payment_methods_is_verified_idx on public.payment_methods(is_verified);

-- Profiles table indexes
create index if not exists profiles_account_number_idx on public.profiles(account_number);
create index if not exists profiles_email_idx on public.profiles(email);

-- Payments table indexes
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_bill_id_idx on public.payments(bill_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_payment_date_idx on public.payments(payment_date);

-- Composite indexes for common query patterns
create index if not exists bills_user_status_idx on public.bills(user_id, status);
create index if not exists payment_methods_user_default_idx on public.payment_methods(user_id, is_default);
