dc.ui.Organizer = dc.View.extend({

  id : 'organizer',

  callbacks : {
    '#new_project.click'      : 'promptNewProject',
    '#upload_document.click'  : 'openUploads',
    '#projects_tab.click'     : 'showProjects',
    '#entities_tab.click'     : 'showEntities'
  },

  facetCallbacks : {
    '.row.click'              : '_filterFacet',
    '.cancel_search.click'    : '_removeFacet',
    '.more.click'             : '_loadFacets',
    '.less.click'             : '_showLess',
    '.show_pages.click'       : '_showPages'
  },

  constructor : function(options) {
    this.base(options);
    _.bindAll(this, '_addSubView', '_removeSubView', 'openUploads');
    this.showProjects = _.bind(this.showTab, this, 'projects');
    this.showEntities = _.bind(this.showTab, this, 'entities');
    this._bindToSets();
    this.subViews = [];
  },

  render : function() {
    $(this.el).append(JST.organizer_sidebar({}));
    this.projectInputEl = $('#project_input', this.el);
    this.projectList    = $('.project_list', this.el);
    this.entityList     = $('#organizer_entities', this.el);
    this.renderAll();
    this.showProjects();
    this.setCallbacks();
    return this;
  },

  renderAll : function() {
    if (Projects.empty()) this.setMode('no', 'projects');
    $(this.projectList).append((new dc.ui.Project()).render().el);
    _.each(Projects.models(), _.bind(function(model) {
      this._addSubView(null, model);
    }, this));
  },

  showTab : function(kind) {
    this.setMode(kind, 'active');
    $('.tab', this.el).removeClass('active');
    $('#' + kind + '_tab', this.el).addClass('active');
  },

  // Refresh the facets with a new batch.
  renderFacets : function(facets) {
    var filtered  = dc.app.SearchParser.extractEntities(dc.app.searchBox.value());
    var filterMap = _.reduce(filtered, {}, function(memo, item) {
      memo[item.type] = memo[item.type] || {};
      memo[item.type][item.value] = true;
      return memo;
    });
    this._facets = facets;
    this.entityList.html(JST.organizer_entities({entities: facets, active : filterMap}));
    this.setCallbacks(this.facetCallbacks);
  },

  // Just add to the facets, don't blow them away.
  mergeFacets : function(facets) {
    this.renderFacets(_.extend(this._facets, facets));
  },

  clickSelectedItem : function() {
    $(this.selectedItem.el).trigger('click');
  },

  select : function(view) {
    $(view.el).addClass('gradient_selected');
    this.selectedItem = view;
  },

  deselect : function() {
    if (this.selectedItem) $(this.selectedItem.el).removeClass('gradient_selected');
    this.selectedItem = null;
  },

  clear : function() {
    this.deselect();
    $('.box', this.projectList).show();
  },

  promptNewProject : function() {
    var me = this;
    dc.ui.Dialog.prompt('Create a New Project', '', function(title) {
      if (!title) return;
      if (Projects.find(title)) return me._warnAlreadyExists(title);
      var project = new dc.model.Project({title : title, annotation_count : 0, document_ids : []});
      Projects.create(project, null, {error : function() { Projects.remove(project); }});
      return true;
    }, 'short');
  },

  openUploads : function() {
    dc.app.uploader.open();
  },

  _facetStringFor : function(el) {
    var row = $(el).closest('.row');
    var val = row.attr('data-value');
    if (val.match(/\s/)) val = '"' + val + '"';
    return row.attr('data-category') + ': ' + val;
  },

  _filterFacet : function(e) {
    dc.app.searchBox.addToSearch(this._facetStringFor(e.target));
  },

  _removeFacet : function(e) {
    $(e.target).closest('.row').removeClass('active');
    dc.app.searchBox.removeFromSearch(this._facetStringFor(e.target));
    return false;
  },

  _loadFacets : function(e) {
    $(e.target).html('loading &hellip;');
    dc.app.searchBox.loadFacets($(e.target).attr('data-category'));
  },

  _showLess : function(e) {
    var cat = $(e.target).attr('data-category');
    this._facets[cat].splice(5);
    this.renderFacets(this._facets);
  },

  _showPages : function(e) {
    var el = $(e.target).closest('.row');
    Entities.fetch(el.attr('data-category'), el.attr('data-value'), function(entities) {
      var sets = _.reduce(entities, {}, function(memo, ent) {
        var docId = ent.get('document_id');
        memo[docId] = memo[docId] || [];
        memo[docId].push(ent);
        return memo;
      });
      _.each(sets, function(set) {
        Documents.get(set[0].get('document_id')).pageEntities.refresh(set);
      });
    });
  },

  // Bind all possible and Project events for rendering.
  _bindToSets : function() {
    _.each([Projects], _.bind(function(set) {
      set.bind(dc.Set.MODEL_ADDED, this._addSubView);
      set.bind(dc.Set.MODEL_REMOVED, this._removeSubView);
    }, this));
  },

  _warnAlreadyExists : function(title) {
    dc.ui.notifier.show({text : 'A project named "' + title + '" already exists'});
    return false;
  },

  _addSubView : function(e, model) {
    this.setMode('has', 'projects');
    var view = new dc.ui.Project({model : model}).render();
    this.subViews.push(view);
    var models = Projects.models();
    var previous = models[_.indexOf(models, view.model) - 1];
    var previousView = previous && previous.view;
    if (!previous || !previousView) { return $(this.projectList).append(view.el); }
    $(previousView.el).after(view.el);
  },

  _removeSubView : function(e, model) {
    this.subViews = _.without(this.subViews, model.view);
    $(model.view.el).remove();
  }

});
