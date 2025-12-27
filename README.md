# 🎨 FilamentDB

> **A modern, local-first 3D printer filament inventory management system with NFC scanning support**

FilamentDB is a progressive web application (PWA) and Android app designed to help 3D printing enthusiasts track their filament inventory effortlessly. With support for NFC tag scanning, barcode/QR code reading, and URL-based metadata extraction, managing your filament spools has never been easier.

---

## ✨ Features

### 📱 **Cross-Platform**
- **Progressive Web App (PWA)**: Works seamlessly in any modern browser
- **Android App**: Native mobile experience via Capacitor
- **Offline-First**: All data stored locally using IndexedDB (Dexie.js)
- **Optional Sync**: Sync your inventory across devices (when configured)

### 🏷️ **Smart Data Entry**
- **NFC Tag Scanning**: Tap compatible NFC tags (e.g., OpenPrintTag) to instantly read filament data
- **QR Code/Barcode Scanner**: Import filament information from product codes
- **URL Metadata Extraction**: Paste a product URL and automatically extract brand, material, and color
- **Manual Entry**: Full-featured form for manual spool addition

### 📊 **Inventory Management**
- **Visual Dashboard**: See your entire filament collection at a glance
- **Weight Tracking**: Monitor total and remaining filament weight with visual indicators
- **Color-Coded Cards**: Instantly identify spools by their actual filament color
- **Filtering & Search**: Quickly find spools by material type, brand, or color
- **Edit & Delete**: Update spool information or remove consumed filaments

### 🎯 **Additional Capabilities**
- **Material Types**: Support for PLA, PETG, TPU, ABS, ASA, Nylon, and more
- **Diameter Options**: Track both 1.75mm and 2.85mm filaments
- **Purchase History**: Record purchase dates and organize inventory chronologically
- **Dark Mode Design**: Modern glassmorphism UI with vibrant gradients

---

## 🖼️ Screenshots

### Dashboard
![FilamentDB Dashboard](screenshots/dashboard.png)
*Clean, visual overview of your entire filament inventory*

### NFC Scanning
![NFC Tag Scanning](screenshots/nfc-scan.png)
*Tap your phone to an NFC tag and instantly load filament data*

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ and npm
- **Git**
- **(Optional)** Android SDK for building the mobile app

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FilamentDB.git
   cd FilamentDB/web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### Building for Production

**Web (PWA)**
```bash
npm run build
npm run start
```

**Android App**
```bash
# Build the web assets for mobile
npm run build:mobile

# Sync with Capacitor
npm run cap:sync

# Open Android Studio to build APK
npx cap open android
```

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI/Styling**: [Tailwind CSS 4](https://tailwindcss.com/), Lucide Icons
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Mobile**: [Capacitor 8](https://capacitorjs.com/)
- **NFC**: [@capgo/capacitor-nfc](https://www.npmjs.com/package/@capgo/capacitor-nfc)
- **QR Scanner**: [@yudiel/react-qr-scanner](https://www.npmjs.com/package/@yudiel/react-qr-scanner)

### Project Structure
```
FilamentDB/
├── web-app/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── inventory/    # Inventory management
│   │   │   ├── scan/         # NFC/QR scanning
│   │   │   ├── settings/     # App settings
│   │   │   └── api/          # API routes (sync, scraping)
│   │   ├── components/       # React components
│   │   ├── db/               # Dexie database schemas
│   │   └── hooks/            # Custom React hooks (useNFC, etc.)
│   ├── android/              # Capacitor Android project
│   ├── public/               # Static assets
│   └── scripts/              # Build scripts
└── screenshots/              # Documentation images
```

---

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the `web-app/` directory:

```env
# Optional: Backend sync server URL
NEXT_PUBLIC_SYNC_URL=https://your-sync-server.com

# Build mode (auto-detected during build)
BUILD_MODE=pwa  # or 'mobile'
```

### Customization
- **Database Schema**: Edit `src/db/index.ts` to modify the data model
- **Supported Materials**: Update the material types in `src/app/inventory/add/page.tsx`
- **Brand List**: Customize available brands in the form component

---

## 📖 Usage

### Adding a Filament Spool

**Method 1: Manual Entry**
1. Navigate to **Inventory** → **Add New Spool**
2. Fill in the details (brand, material, color, weight, etc.)
3. Click **Save**

**Method 2: NFC Scanning**
1. Go to the **Scan** page
2. Hold your phone near an NFC tag (must contain NDEF records)
3. Review the auto-filled data and save

**Method 3: URL Import**
1. Copy a product URL (e.g., from Prusa, Bambu Lab)
2. Paste it in the **Product URL** field on the Add Spool page
3. Click **Analyze** to auto-populate fields

### Tracking Filament Usage
1. Open a spool from the inventory
2. Click **Edit**
3. Update the **Remaining Weight** slider
4. Save changes

### Syncing Across Devices
*Requires a backend sync server (not included in this repository)*
1. Go to **Settings**
2. Enable **Cloud Sync**
3. Enter your sync server URL
4. Authenticate (implementation-specific)

---

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for unit testing:

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test -- --watch
```

Current test coverage includes:
- NFC data parsing logic (`useNFC.test.ts`)
- URL scraping utilities (`api/scrape/scrape.test.ts`)

---

## 📋 Roadmap

See [improvement_roadmap.md](improvement_roadmap.md) for a detailed technical roadmap. Key upcoming features:

### Phase 1: Stability & Safety
- [ ] Expand test coverage (E2E with Playwright)
- [ ] Fix NFC listener memory leaks
- [ ] Improve error handling for NFC/Camera permissions

### Phase 2: Performance & Sync
- [ ] Implement delta-based synchronization
- [ ] Add conflict resolution for multi-device sync
- [ ] Optimize database queries for large inventories

### Phase 3: UI/UX & Features
- [ ] Add Framer Motion animations
- [ ] Implement advanced filtering (by date, status, etc.)
- [ ] Support for resin/powder materials
- [ ] Print history integration (track which spools were used for which prints)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style (ESLint configuration)
- Write tests for new features
- Update documentation as needed
- Ensure the app builds without errors

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenPrintTag** community for NFC tag standards
- **Capacitor Team** for the amazing cross-platform framework
- **Dexie.js** for making IndexedDB usable
- **Prusa Research** and **Bambu Lab** for inspiring the URL scraping feature

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/FilamentDB/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/FilamentDB/discussions)

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐ on GitHub!

---

**Made with ❤️ for the 3D printing community**
