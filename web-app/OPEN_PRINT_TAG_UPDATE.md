# OpenPrintTag Interface & Docker Update

## Completed Tasks
- **Unified Spool Form**: Created a shared `SpoolForm` component for both "Add" and "Detail" views.
- **Detail Page Update**: The Detail page now mirrors the Add page layout, with a "Read Only" toggle enabled by default.
- **Full OpenPrintTag Spec**: Implemented fields for `series`, `finish`, `preheat`, `tags`, and `dimensions`.
- **Terminology Fix**: Corrected "HullForge TD" to "HueForge TD".
- **Cleanup**: access to `/inventory/edit` is removed as editing is now inline on the Detail page.
- **Docker Update**: Rebuilt and restarted the Docker container successfully.

## Verification
- Docker build passed.
- Container `web-app-web-app-1` is running on port 3000.
- Typescript compilation passed.
