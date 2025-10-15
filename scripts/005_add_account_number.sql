-- Add account_number column to profiles table
alter table profiles add column if not exists account_number text;

-- Update to use authentic E.ON 9-digit format starting with 4
-- Update existing profiles with authentic E.ON Vertragskontonummer format
update profiles
set account_number = '4' || lpad(floor(random() * 100000000)::text, 8, '0')
where account_number is null;
