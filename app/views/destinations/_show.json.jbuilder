json.extract! destination, :ref, :id, :name, :street, :detail, :postalcode, :city, :country, :lat, :lng, :quantity, :phone_number, :comment, :geocoding_accuracy, :geocoding_level
json.geocoding_level_point destination.point?
json.geocoding_level_house destination.house?
json.geocoding_level_street destination.street?
json.geocoding_level_intersection destination.intersection?
json.geocoding_level_city destination.city?
if destination.geocoding_level
  json.geocoding_level_title t('activerecord.attributes.destination.geocoding_level') + ' : ' + t('destinations.form.geocoding_level.' + destination.geocoding_level.to_s)
end
json.take_over destination.take_over && l(destination.take_over, format: :hour_minute_second)
json.open destination.open && l(destination.open, format: :hour_minute)
json.close destination.close && l(destination.close, format: :hour_minute)
json.tag_ids do
  json.array! destination.tags.collect(&:id)
end
json.has_no_position (destination.lat.nil? || destination.lng.nil?) ? t('destinations.index.no_position') : false
