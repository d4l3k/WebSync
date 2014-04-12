migrate 0..1 do
    resp = $postgres.exec("select exists(select * from information_schema.tables where table_name='documents')")
    if resp[0]["exists"]=="t"
        puts " :: Migrating..."
        $postgres.exec("ALTER TABLE documents RENAME TO ws_files")
        $postgres.exec("ALTER TABLE ws_files RENAME COLUMN last_edit_time TO edit_time")
        $postgres.exec("ALTER TABLE ws_files RENAME COLUMN created TO create_time")
        $postgres.exec("ALTER TABLE asset_documents RENAME TO asset_ws_files")
        $postgres.exec("ALTER TABLE asset_ws_files RENAME COLUMN document_id TO file_id")
        $postgres.exec("ALTER TABLE permissions RENAME COLUMN document_id TO file_id")
        $postgres.exec("ALTER TABLE changes RENAME COLUMN document_id TO file_id")
    end
end
