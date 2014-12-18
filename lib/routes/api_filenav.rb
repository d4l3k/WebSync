module WebSync
  module Routes
    class ApiFileNav < Base
      helpers do
        def file_query public: false, text: '', offset: 0, deleted: false, sort_type: 'date', sort_dir: 'desc'
          # TODO: Implement offset
          query = "document_#{public ? 'public' : 'private'}_search"
          params = [text, deleted, sort_type, sort_dir]
          params.push(current_user.email) if !public
          results = begin
            $postgres.exec_prepared(query, params)
          rescue
            # If a bad tsquery, fall back to plainto_tsquery
            $postgres.exec_prepared(query + 'plain', params)
          end.to_a.map do |result|
            id = result['id'].to_i
            result['id'] = id.encode62
            result['size'] = WSFile.get(id).optimal_size
            email = result['owner']
            result['owner'] = {
              email: email
            }
            result['owner']['nice'] = t('you') if current_user.email == email
            result['is_owner'] = current_user.email == email
            result
          end
          if sort_type == 'size'
            results.sort! do |a, b|
              if sort_dir == 'asc'
                a['size'] <=> b['size']
              else
                b['size'] <=> a['size']
              end
            end
          end
          results.map do |result|
            result['size'] = WSFile.human_size result['size']
            result
          end
        end
      end
      get '/apifiles' do
        # TODO add caching
        offset = (params['offset'].to_i / 100.0).floor * 100
        resp = file_query(text: (params['q'] || ''),
                          public: params['public']=='true',
                          offset: offset,
                          deleted: params['deleted']=='true',
                          sort_type: params['sort_type'],
                         sort_dir: params['sort_dir'])
        MultiJson.dump(resp)
      end
    end
  end
end
