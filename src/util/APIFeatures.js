class APIFeatures {
  constructor(query, queryObject) {
    this.query = query;
    this.queryObject = queryObject;
  }

  // filtering
  filter() {
    // remove the excluded fields from the query object
    const excludedFields = ["page", "limit", "sort", "fields"];

    let searchQuery = { ...this.queryObject };

    excludedFields.forEach((field) => delete searchQuery[field]);

    const searchQueryString = JSON.stringify(searchQuery);

    searchQuery = JSON.parse(
      searchQueryString.replace(/\b(gt|lt|gte|lte)\b/g, (match) => `$${match}`)
    );

    this.query.find(searchQuery);

    return this;
  }

  // sorting
  sort() {
    if (this.queryObject.sort) {
      const sortString = this.queryObject.sort.replace(/,/g, " ");

      this.query.sort(sortString);
    }

    return this;
  }

  limitFields() {
    if (this.queryObject.fields) {
      this.query.select(this.queryObject.fields.replace(/,/g, " "));
    }

    return this;
  }

  pagination() {
    // restrict the value of limit and page to be in a certain range

    let limit = 100;

    if (this.queryObject.limit) {
      limit = +this.queryObject.limit > 100 ? 100 : this.queryObject.limit;
    }

    this.query.limit(limit);

    if (this.queryObject.page) {
      const page = +this.queryObject.page >= 1 ? +this.queryObject.page : 1;

      const NoOfDocsToskip = limit * (page - 1);

      this.query.skip(NoOfDocsToskip);
    }

    return this;
  }
}

module.exports = APIFeatures;
