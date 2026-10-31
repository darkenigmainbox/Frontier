# Project Everest interface contract

The project's code image (`CodeImage` in the descriptor) is a dynamic library the host loads and negotiates
through the project interchange contract.

| Field | Value | Meaning |
|---|---|---|
| `ProjectFormatNumber` | `1` | Descriptor revision the host must decode |
| `CodeInterchangeNumber` | `3` | Host C ABI revision the code image targets |
| `InterfaceFingerprint` | `0xb6725f24d0869173` | Host interface layout the code image was compiled against |

Rules the port keeps:

1. The fingerprint is checked at load. A mismatch refuses the image with a diagnostic instead of calling into it.
2. A project without a code image still opens: the session presents the editor shell and the scene directory.
3. The code image registers scene records through the record constructors; it never edits the Outliner directly.

The interchange header and the first diagnostics are validated on the reference engine branch
(`Exhibits/LogStream/Support/ProjectInterchange.h`); the pinned contract will be copied here when the code image
target is added to this repository.
