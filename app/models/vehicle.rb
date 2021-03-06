# Copyright © Mapotempo, 2013-2014
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
class Vehicle < ActiveRecord::Base
  belongs_to :customer
  belongs_to :router
  belongs_to :store_start, class_name: 'Store', inverse_of: :vehicle_starts
  belongs_to :store_stop, class_name: 'Store', inverse_of: :vehicle_stops
  belongs_to :store_rest, class_name: 'Store', inverse_of: :vehicle_rests
  has_many :routes, inverse_of: :vehicle, dependent: :delete_all, autosave: true
  has_many :zones, inverse_of: :vehicle, dependent: :nullify, autosave: true

  nilify_blanks
  auto_strip_attributes :name, :tomtom_id, :masternaut_ref
  validates :customer, presence: true
  validates :store_start, presence: true
  validates :store_stop, presence: true
  validates :name, presence: true
  validates :emission, presence: true, numericality: {only_float: true}
  validates :consumption, presence: true, numericality: {only_float: true}
  validates :capacity, presence: true, numericality: {only_integer: true}
  validates :color, presence: true
  validates_time :open, presence: true
  validates_time :close, presence: true, after: :open
  validates_format_of :color, with: /\A(\#[A-Fa-f0-9]{6})\Z/
  validates_time :rest_start, if: :rest_start
  validates_time :rest_stop, presence: false, after: :rest_start, if: :rest_stop

  after_initialize :assign_defaults, if: 'new_record?'
  before_save :set_stores
  before_update :update_out_of_date

  def self.emissions_table
    [
      [I18n.t('vehicles.emissions_nothing', n: 0), '0'],
      [I18n.t('vehicles.emissions_light_petrol', n: 2.71), '2.71'],
      [I18n.t('vehicles.emissions_light_diesel', n: 3.07), '3.07'],
      [I18n.t('vehicles.emissions_light_lgp', n: 1.77), '1.77'],
    ]
  end

  def self.colors_table
    ['#004499', '#EEEE00', '#00CC00', '#DD0000', '#EEEEBB', '#CC1882', '#558800', '#FFBB00', '#00BBFF', '#BEE562']
  end

  private

  def set_stores
    self.store_start = customer.stores[0] unless store_start
    self.store_stop = store_start unless store_stop
  end

  def assign_defaults
    set_stores
    self.emission = 0
    self.consumption = 0
    self.capacity = 999
    self.color = Vehicle.colors_table[0]
    self.open = Time.utc(2000, 1, 1, 8, 0)
    self.close = Time.utc(2000, 1, 1, 12, 0)
  end

  def update_out_of_date
    if rest_duration_changed?
      if rest_duration.nil?
        # No more rest
        routes.each{ |route|
          route.stops.select{ |stop| stop.is_a?(StopRest) }.each{ |stop|
            route.remove_stop(stop)
          }
        }
      elsif rest_duration_was.nil?
        # New rest
        routes.each{ |route|
          route.add_rest
        }
      end
    end

    if emission_changed? || consumption_changed? || capacity_changed? || open_changed? || close_changed? || store_start_id_changed? || store_stop_id_changed? || router_id_changed? || speed_multiplicator_changed? || rest_start_changed? || rest_stop_changed? || rest_duration_changed? || store_rest_id_changed?
      routes.each{ |route|
        route.out_of_date = true
      }
    end
  end
end
