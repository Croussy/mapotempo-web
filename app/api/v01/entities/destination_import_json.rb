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
class V01::Entities::DestinationImportJson < V01::Entities::Destination
  def self.entity_name
    'V01_DestinationImportJson'
  end

  unexpose(:tag_ids)
  expose(:tags, documentation: { type: String, is_array: true, desc: 'If tags don\'t exist they will be created' })
  unexpose(:geocoding_accuracy)
  unexpose(:take_over_default)
  expose(:route, documentation: { type: String, desc: 'Route reference. If route reference is specified, a new planning will be created with a route using the specified reference' })
  expose(:active, documentation: { type: String, desc: 'In order to specify is stop is active in planning or not (\'0\' if inactive)' })
end