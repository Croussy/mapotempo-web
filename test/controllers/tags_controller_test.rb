require 'test_helper'

class TagsControllerTest < ActionController::TestCase
  set_fixture_class delayed_jobs: Delayed::Backend::ActiveRecord::Job

  setup do
    @request.env['reseller'] = resellers(:reseller_one)
    @tag = tags(:tag_one)
    sign_in users(:user_one)
  end

  test 'should get index' do
    get :index
    assert_response :success
    assert_not_nil assigns(:tags)
    assert_valid response
  end

  test 'should get new' do
    get :new
    assert_response :success
    assert_valid response
  end

  test 'should create tag' do
    assert_difference('Tag.count') do
      post :create, tag: { label: @tag.label }
    end

    assert_redirected_to tags_path
  end

  test 'should not create tag' do
    assert_difference('Tag.count', 0) do
      post :create, tag: { label: '' }
    end

    assert_template :new
    tag = assigns(:tag)
    assert tag.errors.any?
    assert_valid response
  end

  test 'should get edit' do
    get :edit, id: @tag
    assert_response :success
    assert_valid response
  end

  test 'should update tag' do
    patch :update, id: @tag, tag: { label: @tag.label }
    assert_redirected_to tags_path
  end

  test 'should not update tag' do
    patch :update, id: @tag, tag: { label: '' }
    assert_template :edit
    tag = assigns(:tag)
    assert tag.errors.any?
    assert_valid response
  end

  test 'should destroy tag' do
    assert_difference('Tag.count', -1) do
      delete :destroy, id: @tag
    end

    assert_redirected_to tags_path
  end

  test 'should destroy multiple tag' do
    assert_difference('Tag.count', -2) do
      delete :destroy_multiple, tags: { tags(:tag_one).id => 1, tags(:tag_two).id => 1 }
    end

    assert_redirected_to tags_path
  end
end
