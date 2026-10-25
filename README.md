# Kumiko CAD

**Design kumiko panels on your computer, then build them at the bench.**

Kumiko is the Japanese craft of fitting thin wooden strips into lattice patterns without nails.
Kumiko CAD lets you lay out a panel, fill it with traditional patterns, choose your woods and finishes,
and get a cut list with every length and angle, plus a full-size printable layout.

<!-- Add a screenshot here: ![Kumiko CAD](docs/screenshot.png) -->

## Download

Get the installer for your system from the **[latest release](../../releases/latest)**:

| System | File |
| --- | --- |
| Windows | `.msi` or `.exe` |
| macOS (Apple Silicon: M1 and newer) | `aarch64.dmg` |
| macOS (Intel) | `x64.dmg` |
| Linux | `.AppImage` or `.deb` |

The installers aren't code-signed yet, so your system will ask for confirmation the first time:

- **Windows:** if you see "Windows protected your PC", click **More info**, then **Run anyway**.
- **macOS:** open the `.dmg`, drag the app to Applications, then **right-click it and choose Open**
  (the first time only). If it's still blocked, allow it under System Settings, Privacy & Security.
- **Linux:** make the `.AppImage` executable (`chmod +x`) and run it, or install the `.deb`.

There's no account and nothing to configure. Your projects are ordinary files on your computer.

## What you can do

- **Lay out a panel.** Set the size, orientation, corner style and border on a triangular kikko-gumi
  grid, then fill its cells with patterns.
- **Choose from many traditional patterns.** Asanoha, Goma, Kikko, Sakura, Ume, Mitsu-bishi,
  Kaza-guruma, Mikado, Rindo and more, including variants with laminated (sandwiched) strips. Adjust
  each pattern's strip widths, spacing and insets; the limits update as you go so you can't pick
  something that can't be built.
- **Pick woods and finishes.** Basswood, Cedar, Cherry, Sapele, Purpleheart, Padauk and others, in
  natural, oiled, lacquered, stained and waxed finishes, chosen from a color palette. Strips glued into
  one laminated piece share a finish, as they would on your bench.
- **Get a parts list.** Every piece with its length, width, wood, end cuts and joints, a 3D view of each
  one, and export to PDF or Excel.
- **Print a full-size layout.** A 1:1 PDF to build on top of.
- **Save your work.** Projects are plain `.json` files you can keep, back up and share.

## Using it in the browser

Kumiko CAD is a web app too, so you can also run it from source:

```bash
npm install
npm run dev
```

and open http://localhost:5173. See [DEVELOPMENT.md](DEVELOPMENT.md) for building the desktop app
yourself, how the patterns are defined, and how releases are made.

## Feedback and contributions

Found a bug, a pattern that doesn't cut right, or a pattern you'd like added? Please
[open an issue](../../issues). Say which pattern and which settings you used, and attach the project
file if you can.

## License

Add a license here before sharing the source. (Without one, the code is all rights reserved by default.)
