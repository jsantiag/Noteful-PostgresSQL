'use strict';

const express = require('express');

// Create an router instance (aka "mini-app")
const router = express.Router();

// TEMP: Simple In-Memory Database
// const data = require('../db/notes');
// const simDB = require('../db/simDB');
// const notes = simDB.initialize(data);
const knex = require('../knex'); 
const hydrateNotes = require('../utils/hydrateNotes');
// Get All (and search by query)
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const folderId = req.query.folderId;
  const tagId = req.query.tagId; 
  knex.select('notes.id', 'title', 'content', 'folders.id as folderId', 'folders.name as folderName' , 'folders.name as folderName', 'tags.id as tagId', 'tags.name as tagName')
    .from('notes')
    .leftJoin('folders', 'notes.folder_id', 'folders.id')
    .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
    .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
    .modify(function (queryBuilder) {
      if (searchTerm) {
        queryBuilder.where('title', 'like', `%${searchTerm}%`);
      }
    })
    .modify(function(queryBuilder){
      if (folderId) {
        queryBuilder.where('folders.id', folderId);
      }
    })
    .modify(function (queryBuilder) {
      if (tagId) {
        queryBuilder.where('tag_id', tagId);
      }
    })
    .orderBy('notes.id')
    .then(result => {
      if (result) {
        const hydrated = hydrateNotes(result);
        res.json(hydrated); 
      } else {
        next();
      }
    });
});


// Get a single item
router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  knex.select('notes.id', 'title', 'content', 'folders.id as folderId', 'folders.name as folderName' , 'folders.name as folderName', 'tags.id as tagId', 'tags.name as tagName')
    .from('notes')
    .leftJoin('folders', 'folder_id', 'folders.id')
    .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
    .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
    .where('notes.id', id)
    .then(results => {
      if (results) {
        const hydrated = hydrateNotes(results);
        res.json(hydrated);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});



// Put update an item
router.put('/:id', (req, res, next) => {
  const noteId = req.params.id;

  const {title, content, folderId, tags = []} = req.body;
  /***** Never trust users - validate input *****/

  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const updateItem = {
    title:title,
    content:content,
    folder_id: (folderId)? folderId :null
  };

  knex('notes')
    .update(updateItem)
    .where('id', noteId)
    .then(()=>{
      return knex.del().from('notes_tags').where('note_id', noteId);
    })
    .then(()=> {
      const tagsInsert = tags.map(tid => ({note_id: noteId, tag_id:tid}));
      return knex.insert(tagsInsert).into('notes_tags');
    })
    .then(()=>{
      return knex.select('notes.id', 'title', 'content', 'folder_id as folderId', 'folders.name as folderName', 
        'tags.id as tagId', 'tags.name as tagName')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .leftJoin('notes_tags', 'notes.id', 'notes_tags.tag_id')
        .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
        .where('notes.id', noteId);
    })
    .then(result => {
      if (result) {
        const [hydrated] = hydrateNotes(result);
        res.json(hydrated);
      }else{
        next(); 
      }
    })
    .catch(err => {
      next(err);
    });
});
   

// Post (insert) an item
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags} = req.body; // Add `folderId` to object destructure
 

  const newItem = {
    title: title,
    content: content,
    folder_id: (folderId) ? folderId : null // Add `folderId`
  };
 
  if (!newItem.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  } else if (!newItem.content){
    const err = new Error('Missing `content` in request body'); 
    err.status = 400; 
    return next(err); 
  } 
  let noteId;
  // Insert new note into notes table
  knex.insert(newItem).into('notes').returning('id')
    .then(([id]) => {
      // Insert related tags into notes_tags table
      noteId = id;
      const tagsInsert = tags.map(tagId => ({ note_id: noteId, tag_id: tagId }));
      return knex.insert(tagsInsert).into('notes_tags');
    })
    .then(() => {
      // Select the new note and leftJoin on folders and tags
      return knex.select('notes.id', 'title', 'content',
        'folders.id as folder_id', 'folders.name as folderName',
        'tags.id as tagId', 'tags.name as tagName')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
        .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
        .where('notes.id', noteId);
    })
    .then(result => {
      if (result) {
        // Hydrate the results
        const hydrated = hydrateNotes(result)[0];
        // Respond with a location header, a 201 status and a note object
        res.location(`${req.originalUrl}/${hydrated.id}`).status(201).json(hydrated);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});


router.delete('/:id', (req, res, next) => {
  const id = req.params.id;

  knex('notes')
    .select()
    .where({id})
    .del()
    .then(()=>{  
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
