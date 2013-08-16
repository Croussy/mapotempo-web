require 'optimizer'

class PlanningsController < ApplicationController
  load_and_authorize_resource :except => :create
  before_action :set_planning, only: [:show, :edit, :update, :destroy, :move, :refresh, :switch, :update_stop, :optimize_route]

  # GET /plannings
  # GET /plannings.json
  def index
    @plannings = Planning.all
  end

  # GET /plannings/1
  # GET /plannings/1.json
  def show
  end

  # GET /plannings/new
  def new
    @planning = Planning.new
  end

  # GET /plannings/1/edit
  def edit
  end

  # POST /plannings
  # POST /plannings.json
  def create
    @planning = Planning.new(planning_params)
    @planning.user = current_user
    if params[:tags]
      @planning.tags = current_user.tags.select{ |tag| params[:tags].include?(String(tag.id)) }
    end

    @planning.default_routes

    respond_to do |format|
      if @planning.save
        format.html { redirect_to edit_planning_path(@planning), notice: 'Planning was successfully created.' }
        format.json { head :no_content }
      else
        format.html { render action: 'new' }
        format.json { render json: @planning.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /plannings/1
  # PATCH/PUT /plannings/1.json
  def update
    respond_to do |format|
      if @planning.update(planning_params)
        format.html { redirect_to @planning, notice: 'Planning was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: 'edit' }
        format.json { render json: @planning.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /plannings/1
  # DELETE /plannings/1.json
  def destroy
    @planning.destroy
    respond_to do |format|
      format.html { redirect_to plannings_url }
      format.json { head :no_content }
    end
  end

  def move
    destinations = Hash[current_user.destinations.map{ |d| [d.id, d] }]
    destinations[current_user.store_id] = current_user.store
    routes = Hash[@planning.routes.map{ |route| [String(route.id), route] }]
    params["_json"].each{ |r|
      route = routes[r[:route]]
      if r[:destinations]
        route.set_destinations(r[:destinations].collect{ |d| [destinations[d[:id]], !!d[:active]] })
      else
        route.set_destinations([])
      end
    }

    respond_to do |format|
      if @planning.save
        format.html { redirect_to @planning, notice: 'Planning was successfully updated.' }
        format.json { render action: 'show', location: @planning }
      else
        format.json { render json: @planning.errors, status: :unprocessable_entity }
      end
    end
  end

  def refresh
    @planning.compute
    respond_to do |format|
      if @planning.save
        format.html { redirect_to @planning, notice: 'Planning was successfully updated.' }
        format.json { render action: 'show', location: @planning }
      else
        format.json { render json: @planning.errors, status: :unprocessable_entity }
      end
    end
  end

  def switch
    respond_to do |format|
      route = @planning.routes.find{ |route| route.id == Integer(params["route_id"]) }
      vehicle = Vehicle.where(id: Integer(params["vehicle_id"]), user: current_user).first
      if route and vehicle and @planning.switch(route, vehicle) and @planning.compute and @planning.save
        format.html { redirect_to @planning, notice: 'Planning was successfully updated.' }
        format.json { render action: 'show', location: @planning }
      else
        format.json { render json: @planning.errors, status: :unprocessable_entity }
      end
    end
  end

  def update_stop
    @route = Route.where(planning: @planning, id: params[:route_id]).first
    if @route
      @stop = Stop.where(route: @route, destination_id: params[:destination_id]).first
      if @stop
        respond_to do |format|
          if @stop.update(stop_params)
            @planning.compute
            @planning.save
            format.json { render action: 'show', location: @planning }
          else
            format.json { render json: @stop.errors, status: :unprocessable_entity }
          end
        end
      end
    end
  end

  def optimize_route
    @route = Route.where(planning: @planning, id: params[:route_id]).first
    if @route
      optimum = Optimizer.optimize(1, @route.matrix)
      ok = if optimum
        @route.order(optimum)
        @planning.compute && @route.save
        @planning.reload # Refresh stops order
      else
        false
      end
      respond_to do |format|
        if ok
          format.html { redirect_to @planning, notice: 'Planning was successfully updated.' }
          format.json { render action: 'show', location: @planning }
        else
          format.json { render json: @planning.errors, status: :unprocessable_entity }
        end
      end
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_planning
      @planning = Planning.find(params[:id] || params[:planning_id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def planning_params
      params.require(:planning).permit(:name)
    end

    def stop_params
      params.require(:stop).permit(:active)
    end
end
