-- Create bills table for managing user bills
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_number text not null unique,
  bill_date date not null,
  due_date date not null,
  amount decimal(10, 2) not null,
  status text not null check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  bill_type text not null check (bill_type in ('electricity', 'gas', 'water', 'other')),
  consumption_kwh decimal(10, 2),
  period_start date,
  period_end date,
  pdf_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.bills enable row level security;

-- RLS Policies for bills
create policy "Users can view their own bills"
  on public.bills for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bills"
  on public.bills for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bills"
  on public.bills for update
  using (auth.uid() = user_id);

create policy "Users can delete their own bills"
  on public.bills for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index bills_user_id_idx on public.bills(user_id);
create index bills_status_idx on public.bills(status);
create index bills_due_date_idx on public.bills(due_date);
