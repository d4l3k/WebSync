
$postgres.prepare("wsfile_size", "SELECT octet_length(data), octet_length(body) AS octet_length2 FROM ws_files WHERE id=$1 LIMIT 1")
$postgres.prepare("wsfile_size_multi", %w{
WITH RECURSIVE children AS (
    SELECT id, octet_length(data) as dl, octet_length(body) AS bl
        FROM ws_files
        WHERE id = $1
    UNION All
        SELECT a.id, octet_length(data) as dl, octet_length(body) AS bl
        FROM ws_files a
        JOIN children b ON(a.parent_id = b.id)
)
SELECT * FROM children;
}.join("\n"))
$postgres.prepare("wsfile_body_size", "SELECT octet_length(body) FROM ws_files WHERE id=$1 LIMIT 1")
$postgres.prepare("wsfile_update", "UPDATE ws_files SET data = $2 WHERE id = $1")
$postgres.prepare("wsfile_get", "SELECT data::bytea FROM ws_files WHERE id::int = $1 LIMIT 1")

['public', 'private'].each do |type|
  ['', 'plain'].each do |search|
    $postgres.prepare("document_#{type}_search#{search}",
      "SELECT id, name, last_modified, permissions.user_email as owner
        FROM (SELECT
          ws_files.id as id,
          ws_files.name as name,
          ws_files.edit_time as last_modified,
          ws_files.name || ' ' ||
          coalesce((string_agg(p1.user_email, ' ')), '') || ' ' ||
          regexp_replace(coalesce((string_agg(p1.user_email, ' ')), ''), '[@.+]', ' ', 'g') as text,
          to_tsvector(ws_files.name) ||
          to_tsvector(coalesce((string_agg(p1.user_email, ' ')), '')) ||
          to_tsvector(regexp_replace(coalesce((string_agg(p1.user_email, ' ')), ''), '[@.+]', ' ', 'g'))
          as document
          FROM ws_files
          JOIN permissions p1
          ON p1.file_id = ws_files.id
          #{ if type == 'private'
              "JOIN permissions p2
              ON p2.file_id = ws_files.id
              WHERE p2.user_email=$5"
            else
              "WHERE ws_files.visibility='public'"
            end
          } AND ws_files.deleted=$2 GROUP BY ws_files.id) f_search
        JOIN permissions
        ON permissions.file_id = id
        WHERE permissions.level = 'owner'
        AND (
        (f_search.document @@ #{search}to_tsquery($1)) OR
        f_search.text ILIKE ('%' || $1 || '%'))
        ORDER BY
          CASE WHEN $3 = 'name' AND $4 = 'asc' THEN name END ASC,
          CASE WHEN $3 = 'name' AND $4 = 'desc' THEN name END DESC,
          CASE WHEN $3 = 'owner' AND $4 = 'asc' THEN permissions.user_email END ASC,
          CASE WHEN $3 = 'owner' AND $4 = 'desc' THEN permissions.user_email END DESC,
          CASE WHEN $3 = 'date' AND $4 = 'asc' THEN last_modified END ASC,
          CASE WHEN $3 = 'date' AND $4 = 'desc' THEN last_modified END DESC")
  end
end

if defined? migrate
    resp = $postgres.exec("select exists(select * from information_schema.tables where table_name='blobs')")
    if resp[0]["exists"]=="t"
        puts "[MIGRATION] Table 'blobs' exists! Merging into 'ws_files'."
        resp = $postgres.exec("SELECT * FROM blobs")
        resp_binary = $postgres.exec_params("SELECT data FROM blobs",[],1)
        resp.each_with_index do |row, index|
            name = row["name"]
            content_type = row["type"]
            edit_time = DateTime.parse(row["edit_time"])
            create_time = DateTime.parse(row["create_time"])
            file_id = row["document_id"].to_i
            parent = WSFile.get(file_id)
            owner = parent.permissions(level: 'owner').user[0]
            obj = WSFile.create(name: name, create_time: create_time, edit_time: edit_time, directory: false, parent: parent, content_type: content_type)
            obj.data = resp_binary[index]["data"]
            perm = Permission.create(user: owner, file: obj, level: "owner")
        end
        $postgres.exec("DROP TABLE blobs")
    end
end
