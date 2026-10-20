// The desktop app is a window around the web build (../dist). The only native pieces are the
// file dialogs and file access the Save / Open commands use (src/store/fileService.js).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Kumiko CAD");
}
