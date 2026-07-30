import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding Supabase database...");

  // 1. Seed Suppliers
  const { data: existingSuppliers } = await supabase.from("suppliers").select("id");
  if (!existingSuppliers || existingSuppliers.length === 0) {
    console.log("Seeding suppliers...");
    await supabase.from("suppliers").insert([
      {
        name: "UD Nelayan Maju",
        contact_name: "Pak Slamet",
        phone: "081234567890",
        address: "Pelabuhan Muara Baru, Jakarta Utara",
        status: "ACTIVE",
      },
      {
        name: "CV Bahari Lestari",
        contact_name: "Bu Wati",
        phone: "082345678901",
        address: "Jl. Ikan Mujair No. 12, Muara Angke",
        status: "ACTIVE",
      },
    ]);
  }

  // 2. Seed Customers
  const { data: existingCustomers } = await supabase.from("customers").select("id");
  if (!existingCustomers || existingCustomers.length === 0) {
    console.log("Seeding customers...");
    await supabase.from("customers").insert([
      {
        name: "Restoran Seafood Bahari",
        contact_name: "Pak Herman",
        phone: "0211234567",
        email: "herman@baharirest.com",
        billing_address: "Jl. Pantai Indah No. 45, Jakarta Utara",
        payment_term_days: 30,
        status: "ACTIVE",
      },
      {
        name: "RM Nelayan Asli",
        contact_name: "Bu Susi",
        phone: "0218765432",
        email: "susi@nelayanasli.com",
        billing_address: "Jl. Kebon Jeruk No. 12, Jakarta Barat",
        payment_term_days: 14,
        status: "ACTIVE",
      },
      {
        name: "Hotel Grand Marina",
        contact_name: "Chef Kevin",
        phone: "0215556789",
        email: "procurement@grandmarina.id",
        billing_address: "Jl. Marina Boulevard No. 1, Jakarta Utara",
        payment_term_days: 45,
        status: "ACTIVE",
      },
    ]);
  }

  // 3. Seed Products
  const { data: existingProducts } = await supabase.from("products").select("id");
  if (!existingProducts || existingProducts.length === 0) {
    console.log("Seeding products...");
    const productsToInsert = [
      { sku: "SKU-001", name: "Ikan Kakap Merah", category: "Ikan", default_unit: "kg", default_selling_price: 95000, status: "ACTIVE" },
      { sku: "SKU-002", name: "Udang Vannamei", category: "Udang", default_unit: "kg", default_selling_price: 120000, status: "ACTIVE" },
      { sku: "SKU-003", name: "Cumi-cumi Segar", category: "Cumi", default_unit: "kg", default_selling_price: 75000, status: "ACTIVE" },
      { sku: "SKU-004", name: "Kepiting Rajungan", category: "Kepiting", default_unit: "kg", default_selling_price: 180000, status: "ACTIVE" },
      { sku: "SKU-005", name: "Ikan Kerapu", category: "Ikan", default_unit: "kg", default_selling_price: 145000, status: "ACTIVE" },
      { sku: "SKU-006", name: "Lobster Air Laut", category: "Lobster", default_unit: "ekor", default_selling_price: 350000, status: "ACTIVE" },
      { sku: "SKU-007", name: "Ikan Tongkol", category: "Ikan", default_unit: "kg", default_selling_price: 45000, status: "INACTIVE" },
    ];
    const { data: insertedProds, error: prodErr } = await supabase.from("products").insert(productsToInsert).select();
    
    if (insertedProds && insertedProds.length > 0) {
      console.log("Seeding product costs...");
      const costs = [
        { product_id: insertedProds[0].id, unit_cost: 68000, notes: "Harga HPP awal" },
        { product_id: insertedProds[1].id, unit_cost: 88000, notes: "Harga HPP awal" },
        { product_id: insertedProds[2].id, unit_cost: 52000, notes: "Harga HPP awal" },
        { product_id: insertedProds[3].id, unit_cost: 135000, notes: "Harga HPP awal" },
        { product_id: insertedProds[4].id, unit_cost: 110000, notes: "Harga HPP awal" },
        { product_id: insertedProds[5].id, unit_cost: 270000, notes: "Harga HPP awal" },
        { product_id: insertedProds[6].id, unit_cost: 32000, notes: "Harga HPP awal" },
      ];
      await supabase.from("product_costs").insert(costs);
    }
  }

  // 4. Seed Expenses
  const { data: existingExpenses } = await supabase.from("expenses").select("id");
  if (!existingExpenses || existingExpenses.length === 0) {
    console.log("Seeding expenses...");
    await supabase.from("expenses").insert([
      { category: "Gaji", description: "Gaji karyawan bulan Juli 2026", amount: 8500000, expense_date: "2026-07-25" },
      { category: "Sewa", description: "Sewa gudang bulan Juli 2026", amount: 3500000, expense_date: "2026-07-01" },
      { category: "Listrik & Air", description: "Tagihan PLN & PAM", amount: 850000, expense_date: "2026-07-20" },
    ]);
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
