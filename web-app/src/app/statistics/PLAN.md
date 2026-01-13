---
description: Implementation plan for the Statistics page
---

# Statistics Page Implementation Plan

## 1. Overview
We will implement a new **/statistics** page to provide users with visual insights into their filament inventory. This page will help users track their purchasing habits, material usage, and stock distribution over time. The page will be responsive and functional on both the web and Android app.

## 2. Key Features & Metrics

### A. KPI Cards (Summary)
Top-level metrics displayed in a grid (2 columns on mobile, 4 on desktop):
1.  **Active Spools:** Total count of non-empty spools.
2.  **Total Filament Weight:** Sum of remaining weight (kg).
3.  **Top Brand:** The manufacturer appearing most frequently in the active inventory.
4.  **Top Material:** The most common filament type (e.g., PLA).

### B. Charts & Visualizations

#### 1. Inventory Distribution (Categorical Analysis)
*   **By Manufacturer (Brand):** Pie/Donut chart showing the market share of brands in the user's inventory.
*   **By Material Type:** Pie/Donut chart showing the split between PLA, PETG, ABS, etc.
*   **By Color Family (Optional):** Bar chart of most common colors.

#### 2. History & Trends (Time-Series)
*   **Acquisition Over Time:** Bar chart showing the number of new spools added per month.
    *   *Data Source:* `spool.createdAt` (grouped by Month/Year).
    *   *Fallback:* Usage of `lastScanned` for older spools if `createdAt` is missing.

#### 3. Usage Analysis
*   **Consumption by Type:** Stacked Bar chart for each material type showing:
    *   **Used:** (Total Capacity - Remaining Weight)
    *   **Remaining:** (Remaining Weight)
    *   *Goal:* Visualize efficiency and consumption rates per material.

## 3. Technical Implementation

### Libraries
*   **Recharts:** A composable charting library for React components. It is lightweight, responsive, and widely used.
    *   `npm install recharts`

### Data Flow
1.  **Fetching:** Use the existing `useSpools()` hook to retrive all local spool data.
2.  **Processing:** Implement client-side aggregation functions (e.g., `groupSpoolsByDate`, `calculateBrandDistribution`) to transform the flat spool list into chart-ready data structures.
3.  **Responsiveness:** Use `ResponsiveContainer` from Recharts to ensure charts resize correctly on mobile devices.

### Page Structure (`src/app/statistics/page.tsx`)
*   **Header:** Title "Statistics".
*   **KPI Section:** Grid of stat cards.
*   **Charts Grid:**
    *   Row 1: Brand Distribution (Left) | Material Distribution (Right)
    *   Row 2: Acquisition History (Full Width)
    *   Row 3: Usage Analysis (Full Width)

## 4. Dependencies
*   Existing `Spool` type definition (specifically `createdAt`, `brand`, `type`, `weightRemaining`, `weightTotal`).
*   `useSpools` hook.

## 5. Future Enhancements (Post-MVP)
*   **Cost Analysis:** If price fields are added to spools, track total inventory value.
*   **Detailed Usage History:** Log individual prints/weight deductions to show usage velocity over time. 
