# Copyright © Mapotempo, 2014-2015
#
# This file is part of Mapotempo.
#
# Mapotempo is free software. You can redistribute it and/or
# modify since you respect the terms of the GNU Affero General
# Public License as published by the Free Software Foundation,
# either version 3 of the License, or (at your option) any later version.
#
# Mapotempo is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the Licenses for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with Mapotempo. If not, see:
# <http://www.gnu.org/licenses/agpl.html>
#
class V01::Stores < Grape::API
  helpers do
    # Never trust parameters from the scary internet, only allow the white list through.
    def store_params
      p = ActionController::Parameters.new(params)
      p = p[:store] if p.key?(:store)
      p.permit(:ref, :name, :street, :postalcode, :city, :country, :lat, :lng)
    end

    ID_DESC = 'Id or the ref field value, then use "ref:[value]".'
  end

  resource :stores do
    desc 'Fetch customer\'s stores.',
      nickname: 'getStores',
      is_array: true,
      entity: V01::Entities::Store
    params do
      optional :ids, type: Array[Integer], desc: 'Select returned stores by id.'
    end
    get do
      stores = if params.key?(:ids)
        ids = params[:ids].collect(&:to_i)
        current_customer.stores.select{ |store| ids.include?(store.id) }
      else
        current_customer.stores.load
      end
      present stores, with: V01::Entities::Store
    end

    desc 'Fetch store.',
      nickname: 'getStore',
      entity: V01::Entities::Store
    params do
      requires :id, type: String, desc: ID_DESC
    end
    get ':id' do
      id = ParseIdsRefs.read(params[:id])
      present current_customer.stores.where(id).first!, with: V01::Entities::Store
    end

    desc 'Create store.',
      nickname: 'createStore',
      params: V01::Entities::Store.documentation.except(:id).merge(
        name: { required: true },
        city: { required: true }
      ),
      entity: V01::Entities::Store
    post do
      store = current_customer.stores.build(store_params)
      current_customer.save!
      present store, with: V01::Entities::Store
    end

    desc 'Import stores by upload a CSV file or by JSON',
      nickname: 'importStores',
      params: V01::Entities::StoresImport.documentation
    put do
      if params[:stores]
        stores_import = DestinationsImport.new
        stores_import.assign_attributes(replace: params[:replace])
        ImporterStores.import_hash(stores_import.replace, current_customer, params[:stores])
        status 204
      else
        stores_import = DestinationsImport.new
        stores_import.assign_attributes(replace: params[:replace], file: params[:file])
        if stores_import.valid?
          ImporterStores.import_csv(stores_import.replace, current_customer, stores_import.tempfile, stores_import.name, true)
          status 204
        else
          error!({error: stores_import.errors.full_messages}, 422)
        end
      end
    end

    desc 'Update store.',
      nickname: 'updateStore',
      params: V01::Entities::Store.documentation.except(:id),
      entity: V01::Entities::Store
    params do
      requires :id, type: String, desc: ID_DESC
    end
    put ':id' do
      id = ParseIdsRefs.read(params[:id])
      store = current_customer.stores.where(id).first!
      store.assign_attributes(store_params)
      store.save!
      store.customer.save! if store.customer
      present store, with: V01::Entities::Store
    end

    desc 'Delete store.',
      nickname: 'deleteStore'
    params do
      requires :id, type: String, desc: ID_DESC
    end
    delete ':id' do
      id = ParseIdsRefs.read(params[:id])
      current_customer.stores.where(id).first!.destroy
    end

    desc 'Delete multiple stores.',
      nickname: 'deleteStores'
    params do
      requires :ids, type: Array[Integer]
    end
    delete do
      Store.transaction do
        ids = params[:ids].collect(&:to_i)
        current_customer.stores.select{ |store| ids.include?(store.id) }.each(&:destroy)
      end
    end

    desc 'Geocode store.',
      nickname: 'geocodeStore',
      params: V01::Entities::Store.documentation.except(:id),
      entity: V01::Entities::Store
    patch 'geocode' do
      store = Store.new(store_params)
      store.geocode
      present store, with: V01::Entities::Store
    end

    if Mapotempo::Application.config.geocode_complete
      desc 'Auto completion on store.',
        nickname: 'autocompleteStore',
        params: V01::Entities::Store.documentation.except(:id)
      patch 'geocode_complete' do
        p = store_params
        address_list = Geocode.complete(current_customer.stores[0].lat, current_customer.stores[0].lng, 40000, p[:street], p[:postalcode], p[:city])
        address_list = address_list.collect{ |i| {street: i[0], postalcode: i[1], city: i[2]} }
        address_list
      end
    end
  end
end
