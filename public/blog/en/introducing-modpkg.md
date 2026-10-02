> 🚀 **Available now!** Jump in and try it for free right now at: **[modpkg.redsouth.eu](https://modpkg.redsouth.eu)**

## 1. What is MODPKG?

**MODPKG** is a modern, agile, open-source web application designed to build, manage, and package Minecraft modpacks in a 100% universal way, independent of any commercial launcher.

Historically, modpack creators and Minecraft communities have been tied to closed ecosystems (CurseForge Launcher, Modrinth App, Prism Launcher, etc.), where sharing or exporting a package often requires installing heavy software or suffering from platform lock-in. MODPKG breaks these limitations by running **directly in the web browser** (In-Browser Engine), allowing any user to organize mods, textures, shaders, datapacks, and config files in seconds, and export a package ready to play or deploy on servers.

---

## 2. Design Principles & Philosophy

1. **Zero Launcher Lock-In:**  
   Packages created with MODPKG do not require any mandatory launcher. They can be exported as universal `.zip` files compatible with Vanilla Minecraft, dedicated servers, or any third-party launcher.
2. **100% Client-Side & Total Privacy:**  
   The entire packaging, compression, saving, and analysis engine runs locally in the user's browser using `localStorage`, `IndexedDB`, and `JSZip`. No private data or files are transmitted to external servers without the user's express authorization.
3. **Native Multi-Loader & Multi-Version:**  
   Direct support for all modern community loaders: **Fabric, Forge, NeoForge, and Quilt**, as well as compatibility with any Minecraft version (from the latest releases to legacy versions).
4. **Visual Design and REDSOUTH Identity:**  
   A carefully crafted interface with dark and light modes, MODPKG orange corporate accents (`#FE5000`), fluid micro-interactions with Framer Motion, non-intrusive contextual menus, and descriptive tooltips.

---

## 3. Official Formats Ecosystem

MODPKG introduces and standardizes an ecosystem of optimized formats:

| Extension | Type | Purpose |
| :--- | :--- | :--- |
| **`.mpkg`** | **Version Manifest** | Lightweight JSON file containing the index of a specific modpack version. |
| **`.mpkg-proj`** | **Full Project Archive** | Complete backup of the entire project: metadata, version history, and inline custom files. |
| **`.mpkg.zip`** | **Universal Full Bundle** | Self-contained, ready-to-use `.zip` file. Physically packages all `.jar` files and configurations. |

---

## 4. Application Structure and Modules

### 4.1. Home Page
- **Quick access to the last active package** with a dynamic loader and version badge.
- Live local storage metrics (number of saved projects).
- Quick links to the library, the importer, and key platform features.

### 4.2. Package Editor
The heart of the application, designed as an interactive workstation:
- **Topbar:** Dropdown selector to instantly switch between different modpacks without reloading the page.
- **Sidebar:** Filter by content sources, category (Mods, Resourcepacks, Shaders, etc.), and environment (Client, Server).
- **Content Grid:** Dynamic cards with version selector (Latest, Latest Unstable) and direct download.
- **Collapsible Floating Dock:** Dock at the bottom showing the content currently installed in the package.

### 4.3. Files & Overrides Workspace (`customFiles`)
- **Interactive Directory Tree:** Create folders, add files, rename, or recursively delete.
- **Integrated Monaco Editor:** Professional in-browser code editor for configuration files or scripts.

### 4.4. My Library & Global Resources
- Panoramic view of all modpacks created and saved in the browser.
- Collision prevention and atomic storage cleanup.
- **My Global Resources:** Cross-project library allowing you to save mod configurations or external files once and reuse them anywhere.

### 4.5. Advanced Export
Export the modpack at three levels: `.mpkg`, `.mpkg-proj`, or compile everything into a universal `.mpkg.zip` with background downloading and a live progress bar.

---

## 5. Accessibility, Internationalization, and UX

- **5 Languages with Auto-Detection:** English, Español, Português, Français, Deutsch.
- **Theme Selector:** Light Mode, Dark Mode, and OS Sync.
- **Dynamic Alert System:** Multilingual notifications with persistent state.
- **Responsive Design:** Adapted for ultrawide monitors, laptops, and mobile screens.

---

## 6. Next Steps on the Roadmap

- 🌐 **MODPKG Discover:** Community catalog to explore, upvote, and download modpacks created by other members.
- 📖 **MODPKG Docs:** Guides for creators, technical specifications, and tutorials.
- ☁️ **Cloud Sync with REDSOUTH Account:** Automatic project backup and multi-device synchronization.
- ⚡ **MODPKG Bridge:** Our new local agent currently in development, written in Rust, that will securely connect the web directly to your PC for one-click mod syncing and installation.

---

*Developed with passion by @Zmito26 at REDSOUTH Studio.*
