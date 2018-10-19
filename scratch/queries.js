'use strict';

const knex = require('../knex');
//search by title
const searchTerm = 'loony';
knex
  .select('notes.id', 'title', 'content')
  .from('notes')
  .modify(queryBuilder => {
    if (searchTerm) {
      queryBuilder.where('title', 'like', `%${searchTerm}%`);
    }
  })
  .orderBy('notes.id')
  .then(results => {
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(err => {
    console.error(err);
  });
let id = 1000; 
//find by id
knex('notes')
  .select()
  .where({ id })
  .then(results => console.log(results[0]));

//update by id
const newObj = {title: 'jsantiag attempt', content: 'wow, really trying J'};
knex('notes')
  .select()
  .where({id})
  .update(newObj)
  .returning('*')
  .then(results => {
    console.log(results[0]);
  }); 
  
//create new item
const newItem = {title:'bada bing', content: 'bada boom'};
knex('notes')
  .insert(newItem)
  .returning(['id', 'title', 'content'])
  .then((results)=>{
    Object.assign(newItem, results[0]); 
    console.log(newItem);
  });

// //delete
knex('notes')
  .select()
  .where({id})
  .del()
  .then(results=>{
    console.log(results + 'deleted');
  });



const noteId = 99;
const result = [34, 56, 78].map(tagId => ({ note_id: noteId, tag_id: tagId }));
console.log(`insert: ${result} into notes_tags`);